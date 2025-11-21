import { INDUSTRY_BENCHMARKS, summarizeBenchmark } from './analysis/benchmarks.js';
import { buildRecommendations, getTypeSpecificFindings } from './analysis/recommendations.js';

// Prefer explicit global override (set window.AI_MAPPER_API_URL before loading this script)
// otherwise fall back to the deployed backend URL when running on Vercel or relative path locally.
const API_BASE =
  window.AI_MAPPER_API_URL ||
  (window.location.hostname.includes('vercel.app')
    ? 'https://ai-mapper-backend.vercel.app'
    : '');

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
};

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

  let html = '';
  let text = '';

  try {
    setAnalysisState(true);
    if (ctx.inputType === 'url') {
      if (!ctx.url) throw new Error('Please provide a URL to analyze.');
      html = await fetchUrlContent(ctx.url);
      if (!html) throw new Error('Backend fetch failed. Provide HTML or text input instead.');
      text = htmlToText(html);
    } else if (ctx.inputType === 'html') {
      html = elements.htmlInput.value.trim();
      if (!html) throw new Error('Paste HTML source to analyze.');
      text = htmlToText(html);
    } else {
      text = elements.textInput.value.trim();
      if (!text) throw new Error('Paste text content to analyze.');
      html = wrapTextAsHtml(text);
    }

    const result = analyzeContent({
      html,
      text,
      ...ctx,
    });

    state.lastResult = result;
    renderResults(result);
  } catch (error) {
    console.error(error);
    alert(error.message ?? 'Unable to analyze content.');
    updateSnapshot(`Unable to analyze content.\nReason: ${error.message}`);
  } finally {
    setAnalysisState(false);
  }
}

function setAnalysisState(isRunning) {
  elements.analyzeBtn.disabled = isRunning;
  elements.analyzeBtn.textContent = isRunning ? 'Analyzing…' : 'Run AI Mapper Analysis';
}

async function fetchUrlContent(url) {
  const body = JSON.stringify({ url });
  const headers = { 'Content-Type': 'application/json' };
  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers,
      body,
    });
    if (!response.ok) {
      throw new Error('Backend server unavailable or returned an error.');
    }
    const data = await response.json();
    return data.html ?? '';
  } catch (error) {
    // Fallback direct fetch (may fail due to CORS)
    try {
      const proxied = await fetch(url);
      if (!proxied.ok) throw new Error('Direct fetch failed.');
      return await proxied.text();
    } catch (directError) {
      console.warn('Unable to fetch URL without backend', directError);
      throw error;
    }
  }
}

function analyzeContent({ html, text, inputType, url, contentType, industry }) {
  const textStats = computeTextStats(text);
  const structural = analyzeStructure(html, inputType, url);
  const metrics = { ...textStats, ...structural };

  const seo = scoreSEO(metrics, { inputType });
  const geo = scoreGEO(metrics, { contentType });

  const recommendations = buildRecommendations(metrics, { contentType });
  const typeFindings = getTypeSpecificFindings(contentType);

  const snapshot = buildSnapshot(metrics, {
    inputType,
    url,
    schema: structural.schemaTypes,
    readability: textStats.readability,
  });

  const result = {
    seoScore: seo.total,
    geoScore: geo.total,
    pillars: [...seo.pillars, ...geo.pillars],
    recommendations,
    typeFindings,
    snapshot,
    metrics,
    meta: { inputType, url, contentType, industry },
  };

  return result;
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
  };
}

/* SCORING ------------------------------------------------------------------ */
function scoreSEO(metrics, ctx) {
  const schemaScore = metrics.schemaTypes.length ? 30 : ctx.inputType === 'text' ? 15 : 0;
  const viewportScore = metrics.hasViewport ? 25 : ctx.inputType === 'text' ? 15 : 5;
  const httpsScore = metrics.isHttps ? 20 : 5;
  const speedScore = scale(metrics.pageSpeedEstimate, 0, 100, 0, 25);
  const technical = schemaScore + viewportScore + httpsScore + speedScore;

  const titleScore = evaluateRange(metrics.titleLength, 50, 60, 30);
  const metaScore = evaluateRange(metrics.metaLength, 150, 160, 25);
  const headerHierarchyScore = Math.min(25, metrics.headerScore * 0.25);
  const keywordScore = metrics.keywordInIntro ? 20 : 5;
  const onPage = titleScore + metaScore + headerHierarchyScore + keywordScore;

  const wordCountScore = metrics.wordCount >= 800 ? 30 : scale(metrics.wordCount, 300, 800, 10, 30);
  const readabilityScore = metrics.readability >= 60 ? 30 : scale(metrics.readability, 30, 60, 5, 30);
  const structureScore = metrics.parserAccessibilityScore
    ? Math.max(10, metrics.parserAccessibilityScore * 0.2)
    : 12;
  const linkScore = metrics.linkCount >= 4 ? 20 : scale(metrics.linkCount, 0, 4, 5, 20);
  const contentQuality = wordCountScore + readabilityScore + structureScore + linkScore;

  const total = Math.round(technical * 0.33 + onPage * 0.33 + contentQuality * 0.34);

  return {
    total,
    pillars: [
      {
        id: 'technical',
        label: 'Technical SEO',
        score: Math.round(technical),
        description: 'Schema, viewport, HTTPS, page speed estimates.',
        notes: [
          `${metrics.schemaTypes.length ? '✅' : '⚠️'} Schema`,
          `${metrics.hasViewport ? '✅' : '⚠️'} Viewport`,
          `${metrics.isHttps ? '✅' : '⚠️'} HTTPS`,
          `⚡ Speed est: ${metrics.pageSpeedEstimate}`,
        ],
      },
      {
        id: 'onPage',
        label: 'On-Page SEO',
        score: Math.round(onPage),
        description: 'Title/meta quality + header hierarchy + keyword placement.',
        notes: [
          `Title length: ${metrics.titleLength || 'n/a'}`,
          `Meta length: ${metrics.metaLength || 'n/a'}`,
          metrics.keywordInIntro ? '✅ Keyword front-loaded' : '⚠️ Keyword missing in intro',
        ],
      },
      {
        id: 'contentQuality',
        label: 'Content Quality',
        score: Math.round(contentQuality),
        description: 'Depth, readability, structure, and link coverage.',
        notes: [
          `Words: ${metrics.wordCount}`,
          `Readability: ${metrics.readability}`,
          `Links: ${metrics.linkCount}`,
        ],
      },
    ],
  };
}

function scoreGEO(metrics, ctx) {
  const entityScore = scale(metrics.entityDefinitions, 0, 5, 10, 30);
  const infoDensityScore = metrics.factsPer100 >= 5 ? 30 : scale(metrics.factsPer100, 2, 5, 10, 30);
  const semanticStructureScore = metrics.listCoverage ? Math.min(20, metrics.listCoverage * 5) : 10;
  const contextRichnessScore = scale(metrics.avgWordLength, 4, 6, 10, 20);
  let llmComprehension = entityScore + infoDensityScore + semanticStructureScore + contextRichnessScore;

  const qaScore = metrics.qaCount >= 3 ? 35 : scale(metrics.qaCount, 0, 3, 10, 35);
  const toneContribution = scale(metrics.conversationalToneScore, 30, 100, 10, 30);
  const quotableScore = scale(metrics.quotableStatementsRatio, 0.2, 0.5, 5, 20);
  const attributionScore = metrics.attributionCount >= 1 ? 15 : metrics.quotableStatements > 0 ? 10 : 5;
  let promptAlignment = qaScore + toneContribution + quotableScore + attributionScore;

  const flowScore = scoreNaturalLanguageFlow(metrics.avgSentenceLength);
  const authorityScore = scale(metrics.topicalAuthorityScore, 40, 100, 10, 25);
  const voiceScore = scale(metrics.voicePatternScore, 20, 80, 10, 25);
  const parserScore = scale(metrics.parserAccessibilityScore, 40, 100, 10, 20);
  let aiDiscovery = flowScore + authorityScore + voiceScore + parserScore;

  // Content type weighting adjustments
  if (ctx.contentType === 'pressRelease') {
    if (!metrics.schemaTypes.includes('NewsArticle')) {
      llmComprehension -= 10;
    }
    if (metrics.factsPer100 < 8) {
      aiDiscovery -= 5;
    }
  } else if (ctx.contentType === 'blogArticle') {
    if (!metrics.schemaTypes.includes('FAQPage')) {
      promptAlignment -= 5;
    }
    if (metrics.qaCount < 3) {
      promptAlignment -= 5;
    }
  } else if (ctx.contentType === 'productPage') {
    if (!metrics.schemaTypes.includes('Product')) {
      llmComprehension -= 8;
    }
  }

  llmComprehension = clamp(llmComprehension, 0, 100);
  promptAlignment = clamp(promptAlignment, 0, 100);
  aiDiscovery = clamp(aiDiscovery, 0, 100);

  const total = Math.round(llmComprehension * 0.33 + promptAlignment * 0.33 + aiDiscovery * 0.34);

  return {
    total,
    pillars: [
      {
        id: 'llm',
        label: 'LLM Comprehension',
        score: Math.round(llmComprehension),
        description: 'Entity clarity, information density, semantic cues.',
        notes: [
          `Entities: ${metrics.entityDefinitions}`,
          `Facts/100 words: ${metrics.factsPer100.toFixed(1)}`,
          metrics.schemaTypes.length ? '✅ Structured data detected' : '⚠️ No schema',
        ],
      },
      {
        id: 'prompt',
        label: 'Prompt Alignment',
        score: Math.round(promptAlignment),
        description: 'Q&A patterns, conversational tone, quotable statements.',
        notes: [
          `Q&A count: ${metrics.qaCount}`,
          `Tone markers: ${metrics.conversationalMarkers}`,
          `Quotable ratio: ${(metrics.quotableStatementsRatio * 100).toFixed(0)}%`,
        ],
      },
      {
        id: 'aiDiscovery',
        label: 'AI Discovery Signals',
        score: Math.round(aiDiscovery),
        description: 'Natural flow, topical authority, voice search readiness.',
        notes: [
          `Sentence length: ${metrics.avgSentenceLength.toFixed(1)}`,
          `Voice score: ${metrics.voicePatternScore.toFixed(0)}`,
          `Authority: ${metrics.topicalAuthorityScore.toFixed(0)}`,
        ],
      },
    ],
  };
}

/* RENDERING ---------------------------------------------------------------- */
function renderResults(result) {
  const { seoScore, geoScore, pillars, recommendations, typeFindings, metrics } = result;
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
  return `Input: ${meta.inputType.toUpperCase()}${meta.url ? ` (${meta.url})` : ''}
Schema: ${schemaInfo}
Readability: ${meta.readability.toFixed(1)}
Sentences: ${metrics.sentenceCount}, Entities: ${metrics.entityDefinitions}, Q&A: ${metrics.qaCount}`;
}

function updateSnapshot(text) {
  elements.snapshot.textContent = text;
}

/* UTILITIES ---------------------------------------------------------------- */
function htmlToText(html) {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body?.textContent ?? '';
}

function wrapTextAsHtml(text) {
  return `<article><p>${text.replace(/\n/g, '</p><p>')}</p></article>`;
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

function scoreNaturalLanguageFlow(avgSentenceLength) {
  if (!avgSentenceLength) return 10;
  if (avgSentenceLength >= 15 && avgSentenceLength <= 25) return 30;
  return Math.max(10, 30 - Math.abs(20 - avgSentenceLength) * 1.5);
}

function countAttributionStatements(text) {
  const attributionVerbs = (text.match(/\b(said|according to|stated|noted|reports|announced)\b/gi) ?? []).length;
  const quotes = (text.match(/["“”]/g) ?? []).length / 2;
  return Math.round(attributionVerbs + quotes);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scale(value, inMin, inMax, outMin, outMax) {
  if (!Number.isFinite(value)) return outMin;
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  const ratio = (value - inMin) / (inMax - inMin);
  return outMin + ratio * (outMax - outMin);
}

function evaluateRange(value = 0, min, max, maxPoints) {
  if (!value) return maxPoints / 2;
  if (value >= min && value <= max) return maxPoints;
  const distance = Math.min(Math.abs(value - min), Math.abs(value - max));
  const penalty = (distance / max) * maxPoints;
  return Math.max(maxPoints - penalty, maxPoints / 2);
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
}

function exportReport() {
  if (!state.lastResult) {
    alert('Run an analysis before exporting.');
    return;
  }
  const result = state.lastResult;
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
