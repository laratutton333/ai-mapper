import { JSDOM } from 'jsdom';

export function extractMetrics(html = '', url = '') {
  const dom = new JSDOM(html || '<body></body>');
  const document = dom.window.document;

  const bodyText = normalizeWhitespace(document.body?.textContent ?? '');
  const wordCount = countWords(bodyText);
  const sentences = splitSentences(bodyText);
  const sentenceCount = sentences.length || 1;
  const avgSentenceLength = wordCount && sentenceCount ? wordCount / sentenceCount : 0;

  const paragraphs = extractParagraphs(document);
  const paragraphWordCounts = paragraphs.map((paragraph) => countWords(paragraph)).filter(Boolean);
  const avgParagraphLength =
    paragraphWordCounts.length > 0
      ? paragraphWordCounts.reduce((sum, value) => sum + value, 0) / paragraphWordCounts.length
      : wordCount;

  const introSample = getIntroSample(bodyText);

  const title = (document.querySelector('title')?.textContent ?? '').trim();
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((node) => ({
    level: Number.parseInt(node.tagName.replace('H', ''), 10),
    text: node.textContent?.trim() ?? '',
  }));
  const headingStructureQuality = evaluateHeadingStructure(headings);

  const schemaTypes = extractSchemaTypes(document);
  const dominantKeyword = extractDominantKeyword(bodyText);
  const keywordRegex = dominantKeyword ? new RegExp(`\\b${escapeRegex(dominantKeyword)}\\b`, 'gi') : null;
  const keywordOccurrences = keywordRegex ? (bodyText.match(keywordRegex) ?? []).length : 0;
  const keywordDensity = wordCount ? (keywordOccurrences / wordCount) * 100 : 0;
  const keywordInIntro = dominantKeyword ? introSample.toLowerCase().includes(dominantKeyword.toLowerCase()) : false;

  const linkNodes = Array.from(document.querySelectorAll('a[href]'));
  const internalLinkCount = linkNodes.filter((node) => isInternalLink(node.getAttribute('href'), url)).length;

  const imageNodes = Array.from(document.querySelectorAll('img'));
  const imageCount = imageNodes.length;
  const imagesWithAlt = imageNodes.filter((node) => (node.getAttribute('alt') ?? '').trim().length > 0).length;
  const altCoverage = imageCount ? imagesWithAlt / imageCount : 1;

  const listCount = document.querySelectorAll('ul, ol').length;

  const summaryQuality = classifySummaryIntro(paragraphs[0] ?? '');
  const definitionClarity = classifyDefinition(bodyText, dominantKeyword, title);
  const snippetFormatting = classifySnippetFormatting(sentences, listCount);
  const qaCoverage = classifyQAStructure(bodyText);
  const sectionAlignment = classifySectionAlignment(headings, dominantKeyword);
  const factualDensity = calculateFactualDensity(bodyText, wordCount);
  const redundancyScore = calculateRedundancyScore(sentences);
  const syllableCount = countSyllables(bodyText);
  const readabilityScore = calculateFleschKincaid(wordCount, sentenceCount, syllableCount);

  return {
    wordCount,
    titleLength: title.length,
    metaDescriptionPresent: Boolean(metaDescription && metaDescription.trim().length),
    h1Count: headings.filter((heading) => heading.level === 1).length,
    canonicalPresent: Boolean(canonical),
    keywordInIntro,
    headingStructureQuality,
    internalLinkCount,
    altCoverage,
    schemaTypes,
    keywordDensity,
    avgSentenceLength,
    avgParagraphLength,
    listCount,
    summaryQuality,
    definitionClarity,
    snippetFormatting,
    qaCoverage,
    sectionAlignment,
    factualDensity,
    redundancyScore,
    readabilityScore,
    dominantKeyword,
    introSample,
  };
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function countWords(text) {
  const matches = text.match(/\b[\w’-]+\b/gu);
  return matches ? matches.length : 0;
}

function splitSentences(text) {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function extractParagraphs(document) {
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map((node) => normalizeWhitespace(node.textContent ?? ''))
    .filter(Boolean);
  if (paragraphs.length) return paragraphs;

  const fallback = normalizeWhitespace(document.body?.textContent ?? '');
  return fallback.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
}

function calculateFactualDensity(text, wordCount) {
  if (!wordCount) return 0;
  const matches = text.match(/\b\d+(?:\.\d+)?(?:%|(?:\s?(?:million|billion|k|m)))?\b/gi) ?? [];
  return (matches.length / wordCount) * 100;
}

function calculateRedundancyScore(sentences) {
  if (!sentences.length) return 1;
  const normalized = sentences.map((sentence) => sentence.toLowerCase().trim()).filter(Boolean);
  const unique = new Set(normalized);
  return unique.size / normalized.length;
}

function classifySummaryIntro(paragraph = '') {
  if (!paragraph) return 'none';
  const sentences = splitSentences(paragraph);
  if (!sentences.length) return 'none';
  const candidate = sentences.slice(0, 4);
  const conciseSentences = candidate.filter((sentence) => countWords(sentence) <= 30);
  if (candidate.length >= 2 && candidate.length <= 4 && conciseSentences.length === candidate.length) {
    return 'strong';
  }
  if (conciseSentences.length >= Math.max(1, candidate.length - 1)) {
    return 'partial';
  }
  return 'none';
}

function classifyDefinition(text, keyword, title) {
  const focus = keyword || title?.split('|')?.[0]?.trim() || '';
  if (!focus) return 'partial';
  const regex = new RegExp(`\\b${escapeRegex(focus)}\\b\\s+(is|are)\\s+(an?|the)`, 'i');
  if (regex.test(text)) return 'clear';
  const fallbackRegex = /\bis\s(an|a|the)\s/gi;
  return fallbackRegex.test(text) ? 'partial' : 'none';
}

function classifySnippetFormatting(sentences, listCount) {
  if (!sentences.length && !listCount) return 'none';
  const shortSentences = sentences.filter((sentence) => countWords(sentence) <= 20).length;
  const ratio = sentences.length ? shortSentences / sentences.length : 1;
  if (ratio >= 0.6 && listCount > 0) return 'strong';
  if (ratio >= 0.4 || listCount > 0) return 'partial';
  return 'none';
}

function classifyQAStructure(text) {
  const questions = (text.match(/\?/g) ?? []).length;
  const qaMarkers = (text.match(/\bQ[:\-]/gi) ?? []).length;
  if (questions >= 3 || qaMarkers >= 2) return 'multiple';
  if (questions >= 1 || qaMarkers >= 1) return 'single';
  return 'none';
}

function classifySectionAlignment(headings, keyword) {
  if (!headings.length) return 'weak';
  const keywordLower = keyword?.toLowerCase();
  const aligned = headings.filter((heading) => {
    const value = heading.text.toLowerCase();
    if (keywordLower && value.includes(keywordLower)) return true;
    return /\b(who|what|when|where|why|how|guide|overview|benefits)\b/.test(value);
  }).length;
  const ratio = aligned / headings.length;
  if (ratio >= 0.6) return 'strong';
  if (ratio >= 0.3) return 'partial';
  return 'weak';
}

function calculateFleschKincaid(words, sentences, syllables) {
  if (!words || !sentences) return 0;
  const fk = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Number.isFinite(fk) ? Number(fk.toFixed(1)) : 0;
}

function countSyllables(text) {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
  return words.reduce((total, word) => total + estimateSyllables(word), 0);
}

function estimateSyllables(word) {
  const cleaned = word.replace(/e\b/, '');
  const matches = cleaned.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(matches.length, 1) : 1;
}

function extractSchemaTypes(document) {
  const types = new Set();
  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const data = JSON.parse(script.textContent ?? '{}');
      if (Array.isArray(data)) {
        data.forEach((entry) => collectSchemaType(entry, types));
      } else {
        collectSchemaType(data, types);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  document.querySelectorAll('[itemscope][itemtype]').forEach((node) => {
    const value = node.getAttribute('itemtype');
    if (value) {
      const type = value.split('/').pop();
      if (type) types.add(type);
    }
  });

  return Array.from(types);
}

function collectSchemaType(entry, set) {
  if (!entry) return;
  const type = entry['@type'];
  if (Array.isArray(type)) {
    type.forEach((value) => value && set.add(value));
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
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? '';
}

function evaluateHeadingStructure(headings) {
  if (!headings.length) return 'poor';
  let status = 'strong';
  let previousLevel = null;
  let h1Count = 0;
  for (const heading of headings) {
    const level = heading.level;
    if (level === 1) h1Count += 1;
    if (previousLevel && level - previousLevel > 1) {
      status = status === 'strong' ? 'minor' : 'poor';
    }
    previousLevel = level;
  }
  if (headings[0]?.level !== 1) status = 'minor';
  if (h1Count !== 1) status = 'poor';
  return status;
}

function getIntroSample(text) {
  return text.split(/\s+/).slice(0, 100).join(' ');
}

function isInternalLink(href, baseUrl) {
  if (!href) return false;
  if (href.startsWith('#') || href.startsWith('mailto:')) return false;
  if (href.startsWith('/')) return true;
  if (!baseUrl) return false;
  try {
    const source = new URL(baseUrl);
    const target = new URL(href, baseUrl);
    return target.hostname === source.hostname;
  } catch {
    return false;
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
