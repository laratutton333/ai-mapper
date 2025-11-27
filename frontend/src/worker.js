import { buildRecommendations, getTypeSpecificFindings } from './analysis/recommendations.js';

self.onmessage = (event) => {
  const payload = event.data || {};
  try {
    const settings = payload.settings ?? {};
    const result = analyzeContent({
      html: payload.html ?? '',
      text: typeof payload.text === 'string' ? payload.text : '',
      inputType: settings.inputType ?? 'url',
      url: settings.url ?? '',
      contentType: settings.contentType ?? 'General',
      industry: settings.industry ?? 'general',
      analysisMode: settings.analysisMode ?? 'dual',
      performance: payload.performance ?? null,
      backendMetrics: payload.backendMetrics ?? null,
      seoScore: payload.seoScore,
      geoScore: payload.geoScore,
      seoBreakdown: payload.seoBreakdown ?? {},
      geoBreakdown: payload.geoBreakdown ?? {},
      microsoftBingChecks: payload.microsoftBingChecks ?? null,
    });
    const performanceNormalized = normalizePerformance(result.performance ?? payload.performance ?? null);
    self.postMessage({
      ...result,
      performanceNormalized,
    });
  } catch (error) {
    self.postMessage({ error: error?.message || 'Failed to process analysis payload.' });
  }
};

function analyzeContent({
  html,
  text,
  inputType,
  url,
  contentType,
  industry,
  analysisMode,
  performance,
  backendMetrics,
  seoScore,
  geoScore,
  seoBreakdown,
  geoBreakdown,
  microsoftBingChecks,
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

  const seoPillars = buildSeoPillars(seo.breakdown);
  const geoPillars = buildGeoPillars(geo.breakdown);
  const pillars = [...seoPillars, ...geoPillars];

  return {
    seoScore: seo.total,
    geoScore: geo.total,
    pillars,
    seoPillars,
    geoPillars,
    recommendations,
    typeFindings,
    snapshot,
    metrics,
    performance,
    seoBreakdown: seo.breakdown,
    geoBreakdown: geo.breakdown,
    microsoftBingChecks,
    meta: { inputType, url, contentType, industry, analysisMode },
  };
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
  structuredData: {
    id: 'structuredData',
    label: 'Structured Data',
    description: 'Schema alignment, breadcrumbs, and entity relationships.',
    maxPoints: 20,
  },
  contentClarity: {
    id: 'contentClarity',
    label: 'Content Structure & Clarity',
    description: 'Headings, TL;DR coverage, Q&A blocks, and chunked paragraphs.',
    maxPoints: 20,
  },
  entityArchitecture: {
    id: 'entityArchitecture',
    label: 'Entity Architecture',
    description: 'Internal linking, anchors, and clean URL structures.',
    maxPoints: 15,
  },
  technicalGeo: {
    id: 'technicalGeo',
    label: 'Technical GEO & Indexability',
    description: 'llms.txt, IndexNow, robots directives, and SSR/lightweight HTML.',
    maxPoints: 20,
  },
  authoritySignals: {
    id: 'authoritySignals',
    label: 'Authority & Source Signals',
    description: 'Author schema, bios, citations, and first-party signals.',
    maxPoints: 15,
  },
  freshness: {
    id: 'freshness',
    label: 'Freshness',
    description: 'Recent updates and current content references.',
    maxPoints: 5,
  },
  safety: {
    id: 'safety',
    label: 'Safety & Consistency',
    description: 'Disclaimers, clarity, and absence of contradictions.',
    maxPoints: 5,
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

  const pageSpeedEstimate = Math.max(55, 95 - imageCount * 3 - doc.querySelectorAll('script').length * 2);
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

function formatBytesToKB(bytes = 0) {
  const numeric = Number(bytes);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  const kb = numeric / 1024;
  return kb >= 100 ? Math.round(kb) : Number(kb.toFixed(1));
}

function normalizePerformance(performance = {}) {
  if (!performance) return null;
  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const normalized = {
    performanceScore: toNumber(performance.performanceScore),
    responseTime: toNumber(performance.responseTime ?? performance.responseTimeMs),
    pageSizeKB: toNumber(performance.pageSizeKB ?? formatBytesToKB(performance.pageSizeBytes)),
    numRequests: toNumber(performance.numRequests ?? performance.requests),
    largestImageKB: toNumber(performance.largestImageKB ?? formatBytesToKB(performance.largestImageBytes)),
    grades: performance.grades ?? {},
  };
  if (
    normalized.performanceScore === null &&
    normalized.responseTime === null &&
    normalized.pageSizeKB === null &&
    normalized.numRequests === null &&
    normalized.largestImageKB === null
  ) {
    return null;
  }
  return normalized;
}

