import { INDUSTRY_BENCHMARKS, summarizeBenchmark } from './analysis/benchmarks.js';
import { buildRecommendations, getTypeSpecificFindings } from './analysis/recommendations.js';

// Prefer explicit global override (set window.AI_MAPPER_API_URL before loading this script)
// otherwise fall back to the deployed backend URL when running on Vercel or relative path locally.
const API_BASE = window.AI_MAPPER_API_URL || 'https://ai-mapper-backend.vercel.app';

const state = {
  inputType: 'url',
  mode: 'dual',
  recommendationView: 'combined',
  lastResult: null,
};

const elements = {
  urlField: document.getElementById('url-field'),
  htmlField: document.getElementById('html-field'),
  textField: document.getElementById('text-field'),
  urlInput: document.getElementById('urlInput'),
  htmlInput: document.getElementById('htmlInput'),
  textInput: document.getElementById('textInput'),
  contentType: document.getElementById('contentType'),
  industry: document.getElementById('industrySelect'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  resetBtn: document.getElementById('resetBtn'),
  exportBtn: document.getElementById('exportBtn'),
  seoScore: document.getElementById('seoScore'),
  geoScore: document.getElementById('geoScore'),
  gapScore: document.getElementById('gapScore'),
  gapNarrative: document.getElementById('gapNarrative'),
  pillarBreakdown: document.getElementById('pillarBreakdown'),
  seoBenchmark: document.getElementById('seoBenchmark'),
  geoBenchmark: document.getElementById('geoBenchmark'),
  seoBenchmarkLabel: document.getElementById('seoBenchmarkLabel'),
  geoBenchmarkLabel: document.getElementById('geoBenchmarkLabel'),
  recommendationList: document.getElementById('recommendationList'),
  typeSpecific: document.querySelector('#typeSpecificFindings ul'),
  snapshot: document.getElementById('analysisSnapshot'),
  performanceScore: document.getElementById('performanceScoreValue'),
  performanceGrid: document.getElementById('performanceGrid'),
};
const heroJumpButtons = document.querySelectorAll('[data-jump]');
const subscriptionModal = document.getElementById('subscriptionModal');
const subscriptionCloseBtn = subscriptionModal?.querySelector('[data-close-modal]');
const loadingOverlay = document.getElementById('loadingOverlay');

/* UI INIT ------------------------------------------------------------------ */
initChipGroup('input-type', (value) => {
  state.inputType = value;
  toggleInputFields(value);
});

initChipGroup('mode-toggle', (value) => {
  state.mode = value;
});

initChipGroup('recommendation-view', (value) => {
  state.recommendationView = value;
  if (state.lastResult) {
    renderRecommendations(state.lastResult.recommendations);
  }
});

elements.analyzeBtn.addEventListener('click', handleAnalyze);
elements.resetBtn.addEventListener('click', resetForm);
elements.exportBtn.addEventListener('click', exportReport);
heroJumpButtons.forEach((button) => {
  const targetSelector = button.dataset.jump;
  if (!targetSelector) return;
  const target = document.querySelector(targetSelector);
  if (!target) return;
  button.addEventListener('click', () => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
subscriptionCloseBtn?.addEventListener('click', hideSubscriptionModal);
subscriptionModal?.addEventListener('click', (event) => {
  if (event.target === subscriptionModal) {
    hideSubscriptionModal();
  }
});

toggleInputFields(state.inputType);

function initChipGroup(fieldName, callback) {
  const group = document.querySelector(`.chip-group[data-field="${fieldName}"]`);
  if (!group) return;
  group.addEventListener('click', (event) => {
    const button = event.target.closest('.chip');
    if (!button) return;
    group.querySelectorAll('.chip').forEach((chip) => chip.classList.remove('chip--active'));
    button.classList.add('chip--active');
    callback(button.dataset.value);
  });
}

function toggleInputFields(type) {
  elements.urlField.classList.toggle('hidden', type !== 'url');
  elements.htmlField.classList.toggle('hidden', type !== 'html');
  elements.textField.classList.toggle('hidden', type !== 'text');
}

/* ANALYSIS ----------------------------------------------------------------- */
async function handleAnalyze() {
  const ctx = {
    inputType: state.inputType,
    contentType: elements.contentType.value,
    industry: elements.industry.value,
    url: elements.urlInput.value.trim(),
  };

  try {
    setAnalysisState(true);
    const payload = buildAnalysisPayload(ctx);
    const fetched = await runAnalysis(payload);
    const html = fetched.html ?? '';
    if (!html) throw new Error('Analysis returned no HTML. Please try another input.');
    const text = htmlToText(html);

    const result = analyzeContent({
      html,
      text,
      performance: fetched.performance ?? null,
      backendMetrics: fetched.metrics ?? null,
      seoScore: fetched.seoScore,
      geoScore: fetched.geoScore,
      seoBreakdown: fetched.seoBreakdown ?? {},
      geoBreakdown: fetched.geoBreakdown ?? {},
      ...ctx,
    });

    state.lastResult = result;
    renderResults(result);
  } catch (error) {
    console.error(error);
    if (error.code === 'subscription_required') {
      showSubscriptionModal();
      updateSnapshot('Subscription required to continue analyzing content.');
    } else {
      alert(error.message ?? 'Unable to analyze content.');
      updateSnapshot(`Unable to analyze content.\nReason: ${error.message}`);
    }
  } finally {
    setAnalysisState(false);
  }
}

function setAnalysisState(isRunning) {
  elements.analyzeBtn.disabled = isRunning;
  elements.analyzeBtn.textContent = isRunning ? 'Analyzing…' : 'Run AI Mapper Analysis';
  if (loadingOverlay) {
    loadingOverlay.classList.toggle('loading-overlay--visible', isRunning);
    loadingOverlay?.setAttribute('aria-hidden', isRunning ? 'false' : 'true');
  }
}

function buildAnalysisPayload(ctx) {
  if (ctx.inputType === 'url') {
    if (!ctx.url) throw new Error('Please provide a URL to analyze.');
    return { url: ctx.url };
  }
  if (ctx.inputType === 'html') {
    const html = elements.htmlInput.value.trim();
    if (!html) throw new Error('Paste HTML source to analyze.');
    return { html };
  }
  const text = elements.textInput.value.trim();
  if (!text) throw new Error('Paste text content to analyze.');
  return { text };
}

async function runAnalysis(payload) {
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json' };

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // ignore JSON parsing errors
    }

    if (payload?.error === 'subscription_required') {
      const error = new Error(payload.message ?? 'Subscription required to continue.');
      error.code = 'subscription_required';
      throw error;
    }

    const message =
      payload?.message || payload?.error || 'Backend server unavailable or returned an error.';
    throw new Error(message);
  }

  const data = await response.json();
  return {
    html: data.html ?? '',
    performance: data.performance ?? null,
    metrics: data.metrics ?? null,
    seoScore: data.seoScore ?? 0,
    geoScore: data.geoScore ?? 0,
    seoBreakdown: data.seoBreakdown ?? {},
    geoBreakdown: data.geoBreakdown ?? {},
  };
}

function analyzeContent({
  html,
  text,
  inputType,
  url,
  contentType,
  industry,
  performance,
  backendMetrics,
  seoScore,
  geoScore,
  seoBreakdown,
  geoBreakdown,
}) {
  const textStats = computeTextStats(text);
  const structural = analyzeStructure(html, inputType, url);
  const metrics = { ...textStats, ...structural, ...(backendMetrics ?? {}) };
  if (metrics.hasDataTable) {
    metrics.topicalAuthorityScore = Math.min(100, metrics.topicalAuthorityScore + 10);
  }
  metrics.hasProprietaryData =
    metrics.hasDataTable ||
    metrics.factsPer100 >= 8 ||
    metrics.proprietarySignalScore >= 5;

  const seo = {
    total: Number.isFinite(seoScore) ? Number(seoScore) : 0,
    breakdown: seoBreakdown ?? {},
  };
  const geo = {
    total: Number.isFinite(geoScore) ? Number(geoScore) : 0,
    breakdown: geoBreakdown ?? {},
  };

  const recommendations = buildRecommendations(metrics, { contentType });
  const typeFindingsRaw = getTypeSpecificFindings(contentType, metrics);
  const typeFindings = typeFindingsRaw.filter(Boolean);

  const snapshot = buildSnapshot(metrics, {
    inputType,
    url,
    schema: structural.schemaTypes,
    readability: textStats.readability,
    performance,
  });

  const pillars = [...buildSeoPillars(seo.breakdown), ...buildGeoPillars(geo.breakdown)];

  const result = {
    seoScore: seo.total,
    geoScore: geo.total,
    pillars,
    recommendations,
    typeFindings,
    snapshot,
    metrics,
    performance,
    seoBreakdown: seo.breakdown,
    geoBreakdown: geo.breakdown,
    meta: { inputType, url, contentType, industry },
  };

  return result;
}

const SEO_PILLAR_META = {
  technical: {
    id: 'technical',
    label: 'Technical SEO',
    description: 'Title/meta coverage, canonical hygiene, and baseline crawl signals.',
    maxPoints: 30,
  },
  content: {
    id: 'contentQuality',
    label: 'Content Quality',
    description: 'Keyword placement, internal linking, schema, and topical coverage.',
    maxPoints: 35,
  },
  readability: {
    id: 'readability',
    label: 'Readability',
    description: 'Sentence + paragraph length with scannable formatting.',
    maxPoints: 30,
  },
};

const GEO_PILLAR_META = {
  directAnswer: {
    id: 'directAnswer',
    label: 'Direct Answer Quality',
    description: 'Summary intros, definition clarity, snippet-ready formatting.',
    maxPoints: 40,
  },
  conversational: {
    id: 'conversational',
    label: 'Conversational Structure',
    description: 'Q&A coverage and heading alignment to intent.',
    maxPoints: 30,
  },
  ingestion: {
    id: 'ingestion',
    label: 'LLM Ingestion Optimization',
    description: 'Factual statements, redundancy control, and clarity.',
    maxPoints: 30,
  },
};

function buildSeoPillars(breakdown = {}) {
  return buildPillarsFromBreakdown(breakdown, SEO_PILLAR_META);
}

function buildGeoPillars(breakdown = {}) {
  return buildPillarsFromBreakdown(breakdown, GEO_PILLAR_META);
}

function buildPillarsFromBreakdown(breakdown = {}, categoryMeta = {}) {
  const categories = {};
  Object.values(breakdown).forEach((entry) => {
    const meta = categoryMeta[entry.category];
    if (!meta) return;
    if (!categories[entry.category]) {
      categories[entry.category] = { points: 0, max: 0, notes: [] };
    }
    categories[entry.category].points += entry.points ?? 0;
    categories[entry.category].max += entry.maxPoints ?? 0;
    categories[entry.category].notes.push(`${entry.label}: ${entry.points}/${entry.maxPoints}`);
  });

  return Object.entries(categoryMeta).map(([key, meta]) => {
    const data = categories[key] ?? { points: 0, max: meta.maxPoints ?? 0, notes: [] };
    const maxPoints = data.max || meta.maxPoints || 1;
    const score = Math.round((data.points / maxPoints) * 100);
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      score,
      notes: data.notes.length ? data.notes : ['No checks evaluated.'],
    };
  });
}

/* TEXT + STRUCTURAL METRICS ------------------------------------------------ */
function computeTextStats(text = '') {
  const cleanText = text.trim();
  const wordCount = countWords(cleanText);
  const sentences = splitSentences(cleanText);
  const sentenceCount = sentences.length || 1;
  const syllableCount = countSyllables(cleanText);
  const readability = calculateFleschKincaid(wordCount, sentenceCount, syllableCount);
  const avgSentenceLength = wordCount && sentenceCount ? wordCount / sentenceCount : 0;
  const avgWordLength = calculateAverageWordLength(cleanText);
  const paragraphCount = Math.max(cleanText.split(/\n{2,}/).length, 1);
  const infoDensity = calculateInformationDensity(cleanText, wordCount);
  const factsPer100 = infoDensity;
  const entityDefinitions = countEntityDefinitions(cleanText);
  const qaCount = countQuestionPatterns(cleanText);
  const conversationalMarkers = countConversationalTone(cleanText);
  const quotableStats = calculateQuotableStatements(cleanText, sentences);
  const voicePatternScore = scoreVoicePatterns(sentences);
  const conversationalToneScore = Math.min(100, (conversationalMarkers / 12) * 100);
  const topicalAuthorityScore = scoreTopicalAuthority(cleanText);
  const parserAccessibilityScore = scoreParserAccessibility(cleanText);
  const attributionCount = countAttributionStatements(cleanText);
  const proprietarySignalScore = scoreProprietarySignals(cleanText);

  return {
    text: cleanText,
    wordCount,
    sentenceCount,
    readability,
    avgSentenceLength,
    avgWordLength,
    paragraphCount,
    factsPer100,
    entityDefinitions,
    qaCount,
    conversationalMarkers,
    quotableStatements: quotableStats.count,
    quotableStatementsRatio: quotableStats.ratio,
    voicePatternScore,
    conversationalToneScore,
    topicalAuthorityScore,
    parserAccessibilityScore,
    attributionCount,
    proprietarySignalScore,
  };
}

function analyzeStructure(html = '', inputType, url = '') {
  if (!html) {
    return {
      schemaTypes: [],
      hasViewport: inputType === 'text' ? false : true,
      isHttps: url.startsWith('https'),
      pageSpeedEstimate: inputType === 'text' ? 70 : 80,
      titleLength: 0,
      metaLength: 0,
      headerScore: 60,
      keywordInIntro: true,
      linkCount: 0,
      listCoverage: 0,
      hasFaqSchema: false,
      hasProductSchema: false,
      hasDataTable: false,
      dataTableCount: 0,
      likelyOwnedDomain: inferOwnedDomain(url),
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const schemaTypes = extractSchemaTypes(doc);
  const hasViewport = Boolean(doc.querySelector('meta[name="viewport"]'));
  const isHttps = url ? url.startsWith('https://') : true;
  const titleLength = (doc.querySelector('title')?.textContent ?? '').trim().length;
  const metaLength = (doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '').trim().length;
  const headers = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  const headerScore = headers.length ? Math.min(100, headers.length * 15) : 40;
  const linkCount = doc.querySelectorAll('a[href]').length;
  const listCoverage = doc.querySelectorAll('ul, ol').length;
  const imageCount = doc.querySelectorAll('img').length;
  const textContent = htmlToText(html);
  const dominantKeyword = extractDominantKeyword(textContent);
  const intro = textContent.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
  const keywordInIntro = dominantKeyword ? intro.includes(dominantKeyword) : true;

  const pageSpeedEstimate = Math.max(55, 95 - imageCount * 3 - (doc.querySelectorAll('script').length * 2));
  const dataTableCount = doc.querySelectorAll('table').length;

  return {
    schemaTypes,
    hasViewport,
    isHttps,
    pageSpeedEstimate,
    titleLength,
    metaLength,
    headerScore,
    keywordInIntro,
    linkCount,
    listCoverage,
    dominantKeyword,
    hasFaqSchema: schemaTypes.includes('FAQPage'),
    hasProductSchema: schemaTypes.includes('Product'),
    hasDataTable: dataTableCount > 0,
    dataTableCount,
    likelyOwnedDomain: inferOwnedDomain(url, doc),
  };
}

function inferOwnedDomain(url = '', doc) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const newsroomHints = ['news', 'press', 'media', 'newsroom', 'mediaroom', 'investor'];
    if (newsroomHints.some((hint) => hostname.includes(hint) || path.includes(hint))) {
      return true;
    }
    const siteName = doc?.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ?? '';
    if (siteName) {
      const sanitized = siteName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sanitized && hostname.includes(sanitized)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* SCORING ------------------------------------------------------------------ */

/* RENDERING ---------------------------------------------------------------- */
function renderResults(result) {
  const { seoScore, geoScore, pillars, recommendations, typeFindings, metrics, performance } = result;
  elements.seoScore.textContent = Number.isFinite(seoScore) ? `${seoScore}` : '--';
  elements.geoScore.textContent = Number.isFinite(geoScore) ? `${geoScore}` : '--';

  const gap = Math.abs(seoScore - geoScore);
  elements.gapScore.textContent = `${gap}`;
  let narrative = 'Balanced performance across SEO and GEO.';
  if (gap >= 20) {
    narrative = `${seoScore > geoScore ? 'Focus on GEO improvements.' : 'Traditional SEO basics need attention.'}`;
  } else if (gap >= 10) {
    narrative = 'Moderate gap. Prioritize cross-framework actions.';
  }
  elements.gapNarrative.textContent = narrative;

  renderPillars(pillars);
  renderRecommendations(recommendations);
  renderTypeSpecific(typeFindings);
  renderPerformance(performance);
  updateBenchmarks(result);
  updateSnapshot(result.snapshot + `\nWords: ${metrics.wordCount} · Readability: ${metrics.readability.toFixed(1)} · Facts/100 words: ${metrics.factsPer100.toFixed(1)}`);
}

function renderPillars(pillars) {
  elements.pillarBreakdown.innerHTML = '';
  pillars.forEach((pillar) => {
    const status = classifyScore(pillar.score);
    const listItems = pillar.notes
      .map((note) => `<li><span>${note}</span></li>`)
      .join('');
    const card = document.createElement('article');
    card.className = 'pillar-card';
    card.innerHTML = `
      <div class="pillar-card__title">
        <div>
          <p class="score-card__eyebrow">${pillar.label}</p>
          <p class="pillar-card__score">${Math.round(pillar.score)}</p>
        </div>
        <span class="chip chip--status ${status.className}">${status.label}</span>
      </div>
      <p class="panel__intro">${pillar.description}</p>
      <ul class="pillar-points">${listItems}</ul>
    `;
    elements.pillarBreakdown.appendChild(card);
  });
}

function renderRecommendations(recommendations) {
  const view = state.recommendationView;
  const list =
    view === 'seo' ? recommendations.seo : view === 'geo' ? recommendations.geo : recommendations.combined;
  elements.recommendationList.innerHTML = '';
  list.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'recommendation-item';
    li.innerHTML = `
      <span class="priority">${item.priority}</span>
      <div>
        <p>${item.text}</p>
      </div>
    `;
    elements.recommendationList.appendChild(li);
  });
}

function renderTypeSpecific(list) {
  elements.typeSpecific.innerHTML = '';
  list.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    elements.typeSpecific.appendChild(li);
  });
}

function renderPerformance(performance) {
  if (!elements.performanceGrid || !elements.performanceScore) return;
  if (!performance) {
    elements.performanceScore.textContent = '--';
    elements.performanceGrid.innerHTML =
      '<p class="helper-text small">URL fetching is required to display performance metrics.</p>';
    return;
  }

  const scoreText = Number.isFinite(performance.performanceScore) ? `${performance.performanceScore}` : '--';
  elements.performanceScore.textContent = scoreText;
  const grades = performance.grades ?? {};
  const gradeClass = {
    optimal: 'grade-badge--optimal',
    acceptable: 'grade-badge--acceptable',
    poor: 'grade-badge--poor',
  };

  const metricRows = [
    {
      label: 'Response time (ms)',
      value: `${performance.responseTimeMs}`,
      grade: grades.responseTime ?? 'acceptable',
    },
    {
      label: 'Page size (KB)',
      value: `${formatBytesToKB(performance.pageSizeBytes)} KB`,
      grade: grades.pageSize ?? 'acceptable',
    },
    {
      label: 'Number of requests',
      value: `${performance.numRequests}`,
      grade: grades.numRequests ?? 'acceptable',
    },
    {
      label: 'Largest image (KB)',
      value: `${formatBytesToKB(performance.largestImageBytes)} KB`,
      grade: grades.largestImage ?? 'acceptable',
    },
  ];

  const template = metricRows
    .map(
      (metric) => `
      <div class="performance-metric">
        <p class="performance-label">${metric.label}</p>
        <p class="performance-value">${metric.value}</p>
        <span class="grade-badge ${gradeClass[metric.grade] ?? 'grade-badge--acceptable'}">${metric.grade}</span>
      </div>`
    )
    .join('');

  elements.performanceGrid.innerHTML = template;
}

function updateBenchmarks(result) {
  const industry = INDUSTRY_BENCHMARKS[result.meta.industry];
  if (!industry) {
    elements.seoBenchmark.textContent = '--';
    elements.geoBenchmark.textContent = '--';
    elements.seoBenchmarkLabel.textContent = 'No benchmark selected';
    elements.geoBenchmarkLabel.textContent = 'No benchmark selected';
    return;
  }
  const seoSummary = summarizeBenchmark(result.seoScore, industry.seo);
  const geoSummary = summarizeBenchmark(result.geoScore, industry.geo);
  elements.seoBenchmark.textContent = `${seoSummary.delta >= 0 ? '+' : ''}${seoSummary.delta}`;
  elements.geoBenchmark.textContent = `${geoSummary.delta >= 0 ? '+' : ''}${geoSummary.delta}`;
  elements.seoBenchmarkLabel.textContent = seoSummary.label;
  elements.geoBenchmarkLabel.textContent = geoSummary.label;
}

function buildSnapshot(metrics, meta) {
  const schemaInfo = meta.schema?.length ? meta.schema.join(', ') : 'None detected';
  const perfLine = meta.performance
    ? `Performance: ${meta.performance.performanceScore}/100 · Response: ${meta.performance.responseTimeMs}ms · Size: ${formatBytesToKB(
        meta.performance.pageSizeBytes
      )} KB · Requests: ${meta.performance.numRequests}`
    : null;
  return `Input: ${meta.inputType.toUpperCase()}${meta.url ? ` (${meta.url})` : ''}
Schema: ${schemaInfo}
Readability: ${meta.readability.toFixed(1)}
Sentences: ${metrics.sentenceCount}, Entities: ${metrics.entityDefinitions}, Q&A: ${metrics.qaCount}${
    perfLine ? `\n${perfLine}` : ''
  }`;
}

function updateSnapshot(text) {
  elements.snapshot.textContent = text;
}

function showSubscriptionModal() {
  subscriptionModal?.classList.add('modal--visible');
}

function hideSubscriptionModal() {
  subscriptionModal?.classList.remove('modal--visible');
}

/* UTILITIES ---------------------------------------------------------------- */
function htmlToText(html) {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body?.textContent ?? '';
}

function extractSchemaTypes(doc) {
  const types = new Set();
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const data = JSON.parse(script.textContent);
      if (Array.isArray(data)) {
        data.forEach((entry) => collectSchemaType(entry, types));
      } else {
        collectSchemaType(data, types);
      }
    } catch (error) {
      // ignore malformed JSON-LD
    }
  });

  doc.querySelectorAll('[itemscope][itemtype]').forEach((node) => {
    types.add(node.getAttribute('itemtype')?.split('/').pop() ?? '');
  });

  const htmlString = doc.documentElement.outerHTML;
  ['FAQPage', 'NewsArticle', 'Product', 'HowTo', 'Article'].forEach((key) => {
    if (htmlString.includes(key)) types.add(key);
  });

  return Array.from(types).filter(Boolean);
}

function collectSchemaType(entry, set) {
  if (!entry) return;
  const type = entry['@type'];
  if (Array.isArray(type)) {
    type.forEach((value) => set.add(value));
  } else if (typeof type === 'string') {
    set.add(type);
  }
}

function extractDominantKeyword(text) {
  const tokens = text
    .toLowerCase()
    .match(/\b[a-z]{4,}\b/g);
  if (!tokens) return '';
  const stopWords = new Set(['with', 'this', 'that', 'from', 'have', 'will', 'about', 'your', 'their', 'news', 'homepage']);
  const counts = {};
  tokens.forEach((word) => {
    if (stopWords.has(word)) return;
    counts[word] = (counts[word] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

function countWords(text) {
  const matches = text.match(/\b[\w’-]+\b/gu);
  return matches ? matches.length : 0;
}

function splitSentences(text) {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.?!])\s+/)
    .filter(Boolean);
}

function countSyllables(text) {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
  return words.reduce((total, word) => total + estimateSyllables(word), 0);
}

function estimateSyllables(word) {
  word = word.replace(/e\b/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(matches.length, 1) : 1;
}

function calculateFleschKincaid(words, sentences, syllables) {
  if (!words || !sentences) return 0;
  const fk = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Number.isFinite(fk) ? parseFloat(fk.toFixed(1)) : 0;
}

function calculateAverageWordLength(text) {
  const tokens = text.match(/\b[a-zA-Z]+\b/g);
  if (!tokens || !tokens.length) return 0;
  const total = tokens.reduce((sum, token) => sum + token.length, 0);
  return total / tokens.length;
}

function calculateInformationDensity(text, wordCount) {
  if (!wordCount) return 0;
  const facts = (text.match(/(\d+[%$MmKk]?|\b(USD|million|billion)\b)/g) ?? []).length;
  return (facts / wordCount) * 100;
}

function countEntityDefinitions(text) {
  return (text.match(/\b[A-Z][\w\s]+?\s(is|are)\s(a|an|the)\b/g) ?? []).length;
}

function countQuestionPatterns(text) {
  const questions = (text.match(/\?/g) ?? []).length;
  const qMarkers = (text.match(/\bQ[:\-]/gi) ?? []).length;
  return questions + qMarkers;
}

function countConversationalTone(text) {
  const matches = text.match(/\b(you|your|we|let's|imagine|picture|let us|chatgpt|copilot)\b/gi);
  return matches ? matches.length : 0;
}

function calculateQuotableStatements(text, sentences) {
  if (!sentences || !sentences.length) {
    sentences = splitSentences(text);
  }
  let count = 0;
  sentences.forEach((sentence) => {
    const wordLen = countWords(sentence);
    if (wordLen >= 6 && wordLen <= 20) count += 1;
    if (sentence.includes('"') || /said|according to/i.test(sentence)) count += 1;
  });
  const ratio = sentences.length ? count / sentences.length : 0;
  return { count, ratio };
}

function scoreVoicePatterns(sentences) {
  if (!sentences.length) return 0;
  const voiceSentences = sentences.filter((sentence) => /^\s*(who|what|when|where|why|how)\b/i.test(sentence)).length;
  return (voiceSentences / sentences.length) * 100;
}

function scoreTopicalAuthority(text) {
  const tokens = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const unique = new Set(tokens);
  if (!tokens.length) return 0;
  const diversity = unique.size / tokens.length;
  return Math.min(100, diversity * 70 + Math.min(unique.size, 80) * 0.3 + 20);
}

function scoreParserAccessibility(text) {
  const bulletCount = (text.match(/^-|\n-|\*/gm) ?? []).length;
  const shortParagraphs = text.split(/\n{2,}/).filter((p) => countWords(p) < 120).length;
  const totalParagraphs = Math.max(text.split(/\n{2,}/).length, 1);
  const ratio = shortParagraphs / totalParagraphs;
  return Math.min(100, ratio * 100 + bulletCount * 2);
}

function countAttributionStatements(text) {
  const attributionVerbs = (text.match(/\b(said|according to|stated|noted|reports|announced)\b/gi) ?? []).length;
  const quotes = (text.match(/["“”]/g) ?? []).length / 2;
  return Math.round(attributionVerbs + quotes);
}

function scoreProprietarySignals(text) {
  const currencyMatches = text.match(/[$€£]\s?\d[\d,\.]*|\bUSD\b|\bCAD\b|\bC\$|\bTSX\b/gi) ?? [];
  const percentMatches = text.match(/\b\d+(?:\.\d+)?%/g) ?? [];
  const dataKeywords = text.match(/\b(proprietary|benchmark|distribution|ETF|index|internal)\b/gi) ?? [];
  return currencyMatches.length + percentMatches.length + dataKeywords.length;
}

function formatBytesToKB(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  const kb = bytes / 1024;
  return kb >= 100 ? Math.round(kb) : Number(kb.toFixed(1));
}

function classifyScore(score) {
  if (score >= 80) return { label: 'Strong', className: '' };
  if (score >= 60) return { label: 'Watch', className: 'challenged' };
  return { label: 'Risk', className: 'risk' };
}

function resetForm() {
  elements.urlInput.value = '';
  elements.htmlInput.value = '';
  elements.textInput.value = '';
  elements.snapshot.textContent = 'Form reset. Add content and run analysis.';
  state.lastResult = null;
  elements.pillarBreakdown.innerHTML = '';
  elements.recommendationList.innerHTML = '';
  elements.typeSpecific.innerHTML = '';
  elements.seoScore.textContent = '--';
  elements.geoScore.textContent = '--';
  elements.gapScore.textContent = '--';
  elements.gapNarrative.textContent = 'Awaiting analysis...';
  elements.seoBenchmark.textContent = '--';
  elements.geoBenchmark.textContent = '--';
  elements.seoBenchmarkLabel.textContent = '';
  elements.geoBenchmarkLabel.textContent = '';
  renderPerformance(null);
}

function exportReport() {
  if (!state.lastResult) {
    alert('Run an analysis before exporting.');
    return;
  }
  const result = state.lastResult;
  const performanceSection = result.performance
    ? `<ul>
  <li>Performance score: ${result.performance.performanceScore}/100</li>
  <li>Response time: ${result.performance.responseTimeMs} ms (${result.performance.grades.responseTime})</li>
  <li>Page size: ${formatBytesToKB(result.performance.pageSizeBytes)} KB (${result.performance.grades.pageSize})</li>
  <li>Requests: ${result.performance.numRequests} (${result.performance.grades.numRequests})</li>
  <li>Largest image: ${formatBytesToKB(result.performance.largestImageBytes)} KB (${result.performance.grades.largestImage})</li>
</ul>`
    : '<p>URL input required to capture live performance metrics.</p>';
  const report = `
<!DOCTYPE html>
<html lang="en">
<meta charset="utf-8" />
<title>AI Mapper Report</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; color: #0f172a; }
h1 { margin-top: 0; }
.scores { display: flex; gap: 1rem; }
.score { flex: 1; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 0.75rem; }
ul { line-height: 1.5; }
footer { margin-top: 2rem; font-size: 0.85rem; color: #475569; }
</style>
<h1>Earned+Owned AI Mapper Report</h1>
<p>Content type: ${elements.contentType.options[elements.contentType.selectedIndex].text}
 · Industry: ${INDUSTRY_BENCHMARKS[result.meta.industry]?.name ?? 'n/a'}</p>
<div class="scores">
  <div class="score"><h2>SEO</h2><p>${result.seoScore}/100</p></div>
  <div class="score"><h2>GEO</h2><p>${result.geoScore}/100</p></div>
</div>
<h2>Pillars</h2>
<ul>
${result.pillars
  .map((pillar) => `<li><strong>${pillar.label}</strong>: ${Math.round(pillar.score)} – ${pillar.description}</li>`)
  .join('\n')}
</ul>
<h2>Recommendations</h2>
<ol>
${result.recommendations.combined.map((item) => `<li>${item.priority} — ${item.text}</li>`).join('\n')}
</ol>
<h2>Performance Metrics</h2>
${performanceSection}
<h2>Type-Specific Findings</h2>
<ul>
${result.typeFindings.map((text) => `<li>${text}</li>`).join('\n')}
</ul>
<h2>Metrics Snapshot</h2>
<pre>${result.snapshot}</pre>
<footer>Generated by Earned+Owned AI Mapper · ${new Date().toLocaleString()}</footer>
</html>`;

  const blob = new Blob([report], { type: 'text/html' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = 'ai-mapper-report.html';
  anchor.click();
  URL.revokeObjectURL(href);
}
