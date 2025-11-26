import { JSDOM } from 'jsdom';

export function extractMetrics(html = '', url = '', options = {}) {
  const siteSignals = options.siteSignals ?? {};
  const statusCode = options.statusCode ?? null;
  const dom = new JSDOM(html || '<body></body>');
  const document = dom.window.document;
  const htmlBytes = Buffer.byteLength(html ?? '', 'utf8');

  const bodyText = normalizeWhitespace(stripEmojis(document.body?.textContent ?? ''));
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

  const schemaData = collectSchemaData(document);
  const schemaTypes = schemaData.types;
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
  const tableCount = document.querySelectorAll('table').length;

  const summaryQuality = classifySummaryIntro(paragraphs[0] ?? '');
  const definitionClarity = classifyDefinition(bodyText, dominantKeyword, title);
  const snippetFormatting = classifySnippetFormatting(sentences, listCount);
  const qaCoverage = classifyQAStructure(bodyText);
  const sectionAlignment = classifySectionAlignment(headings, dominantKeyword);
  const factualDensity = calculateFactualDensity(bodyText, wordCount);
  const redundancyScore = calculateRedundancyScore(sentences);
  const syllableCount = countSyllables(bodyText);
  const readabilityScore = calculateFleschKincaid(wordCount, sentenceCount, syllableCount);
  const summaryTldrPresent = detectSummaryBlock(document);
  const qaBlocksPresent = qaCoverage !== 'none';
  const shortChunkedParagraphs = avgParagraphLength <= 120;
  const listsTablesPresent = listCount > 0 || tableCount > 0;
  const canonicalEntityHubs = detectEntityHubLinks(document);
  const naturalAnchorText = evaluateNaturalAnchorText(document);
  const cleanUrlStructure = isCleanUrl(url);
  const topicClusterInternalLinks = internalLinkCount >= 5;
  const externalAuthoritativeCitations = detectAuthoritativeCitations(document);
  const authorBioAvailable = detectAuthorBio(document);
  const dateModifiedRecent = detectFreshDate(document);
  const currentBodyContent = bodyText.includes(String(new Date().getFullYear()));
  const disclaimersPresent = /\bdisclaimer\b|not (financial|investment) advice/i.test(bodyText);
  const vagueStatementsRatio = countVagueStatements(bodyText, wordCount);
  const noVagueStatements = vagueStatementsRatio < 0.04;
  const noContradictions = !/\bcontradict\b|inconsistent facts?/i.test(bodyText);
  const imageAuthorCitation =
    schemaData.hasImageCitation || Boolean(document.querySelector('figure figcaption, meta[name="author"], meta[property="article:author"]'));
  const msValidateMeta = document.querySelector('meta[name="msvalidate.01"]')?.getAttribute('content')?.trim() ?? null;

  const geoSignals = {
    structuredData: {
      validSchema: schemaTypes.length > 0,
      correctSchemaType: schemaData.hasArticleSchema,
      entityRelationships: schemaData.hasEntityRelations,
      breadcrumbSchema: schemaTypes.includes('BreadcrumbList') || Boolean(document.querySelector('[aria-label="breadcrumb"]')),
      imageAuthorCitationMetadata: imageAuthorCitation,
    },
    contentClarity: {
      headingHierarchy: headingStructureQuality === 'strong',
      summaryTldrPresent: summaryQuality === 'strong' || summaryTldrPresent,
      qaBlocksPresent,
      shortChunkedParagraphs,
      listsTablesPresent,
    },
    entityArchitecture: {
      topicClusterInternalLinks,
      canonicalEntityHubs,
      naturalAnchorText,
      cleanUrlStructure,
    },
    technicalGeo: {
      llmsTxtPresent: Boolean(siteSignals.llmsTxtPresent),
      robotsAllowsLlm: siteSignals.robotsAllowsAll,
      indexnowKeyPresent: Boolean(siteSignals.indexNowEndpointOk),
      serverSideRendering: detectServerSideRendering(document),
      lightweightHtml: htmlBytes <= 350_000,
      sitemapLastmodCorrect: siteSignals.sitemapLastmodRecent,
      correctStatusCodes: typeof statusCode === 'number' ? statusCode >= 200 && statusCode < 400 : true,
    },
    authoritySignals: {
      authorSchema: schemaData.hasAuthor,
      authorBioAvailable,
      externalAuthoritativeCitations,
      firstPartyDataPresent: textHasFirstPartySignals(bodyText),
      factualTone: factualDensity >= 3,
    },
    freshness: {
      dateModifiedRecent,
      currentBodyContent,
    },
    safety: {
      noContradictions,
      disclaimersPresent,
      noVagueStatements,
    },
  };

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
    factsPer100: factualDensity,
    redundancyScore,
    readabilityScore,
    dominantKeyword,
    introSample,
    geoSignals,
    msValidateMeta,
  };
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripEmojis(text = '') {
  return text.replace(/\p{Extended_Pictographic}/gu, '');
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
    .map((node) => normalizeWhitespace(stripEmojis(node.textContent ?? '')))
    .filter(Boolean);
  if (paragraphs.length) return paragraphs;

  const fallback = normalizeWhitespace(stripEmojis(document.body?.textContent ?? ''));
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

function collectSchemaData(document) {
  const types = new Set();
  let hasEntityRelations = false;
  let hasAuthor = false;
  let hasImageCitation = false;
  let hasArticleSchema = false;

  const visitNode = (entry) => {
    if (!entry) return;
    const type = entry['@type'];
    if (type) {
      if (Array.isArray(type)) {
        type.forEach((value) => registerSchemaType(value));
      } else if (typeof type === 'string') {
        registerSchemaType(type);
      }
    }
    if (entry.sameAs || entry.mentions || entry.knowsAbout || entry.subjectOf) {
      hasEntityRelations = true;
    }
    if (entry.author || entry.creator) {
      hasAuthor = true;
    }
    if (entry.image && entry.image.author) {
      hasImageCitation = true;
    }
  };

  function registerSchemaType(value) {
    if (!value) return;
    types.add(value);
    if (/article|newsarticle|blogposting|howto|faqpage|webpage/i.test(value)) {
      hasArticleSchema = true;
    }
    if (/breadcrumblist/i.test(value)) {
      types.add('BreadcrumbList');
    }
  }

  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const data = JSON.parse(script.textContent ?? '{}');
      traverseSchemaNode(data, visitNode);
    } catch {
      // ignore
    }
  });

  document.querySelectorAll('[itemscope][itemtype]').forEach((node) => {
    const value = node.getAttribute('itemtype');
    if (value) {
      const type = value.split('/').pop();
      registerSchemaType(type);
    }
    if (node.querySelector('[itemprop="author"]')) {
      hasAuthor = true;
    }
  });

  return {
    types: Array.from(types).filter(Boolean),
    hasEntityRelations,
    hasAuthor,
    hasImageCitation,
    hasArticleSchema,
  };
}

function traverseSchemaNode(entry, visitor) {
  if (!entry) return;
  visitor(entry);
  if (Array.isArray(entry)) {
    entry.forEach((item) => traverseSchemaNode(item, visitor));
  } else if (typeof entry === 'object') {
    Object.values(entry).forEach((value) => traverseSchemaNode(value, visitor));
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

function detectSummaryBlock(document) {
  if (document.querySelector('[data-summary], .summary, .key-takeaways, .tldr')) return true;
  return /\bTL;DR\b/i.test(document.body?.textContent ?? '');
}

function detectEntityHubLinks(document) {
  const anchors = Array.from(document.querySelectorAll('nav a, header a, footer a'));
  return anchors.some((anchor) => /about|team|company|leadership|newsroom|press|insights/i.test(anchor.textContent ?? ''));
}

function evaluateNaturalAnchorText(document) {
  const anchors = Array.from(document.querySelectorAll('a[href]'));
  if (!anchors.length) return false;
  const descriptive = anchors.filter((anchor) => {
    const text = (anchor.textContent ?? '').trim();
    if (!text || /^https?:/i.test(text)) return false;
    return text.split(/\s+/).length >= 2;
  });
  return descriptive.length / anchors.length >= 0.6;
}

function detectAuthoritativeCitations(document) {
  const anchors = Array.from(document.querySelectorAll('a[href]'));
  if (!anchors.length) return false;
  return anchors.some((anchor) => /\.gov|\.edu|who\.int|un\.org/i.test(anchor.getAttribute('href') ?? ''));
}

function detectAuthorBio(document) {
  return Boolean(
    document.querySelector('.author-bio, .author, .byline, [rel="author"], [itemprop="author"], [class*="author"]')
  );
}

function isCleanUrl(url = '') {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (parsed.search || parsed.hash) return false;
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.length <= 3;
  } catch {
    return true;
  }
}

function detectServerSideRendering(document) {
  const hasHydration = document.querySelector('[data-server-rendered="true"]');
  if (hasHydration) return true;
  const nextData = document.querySelector('#__NEXT_DATA__');
  if (nextData) return false;
  const scriptCount = document.querySelectorAll('script').length;
  const textCoverage = (document.body?.textContent ?? '').trim().length;
  return textCoverage > 0 && scriptCount < 40;
}

function detectFreshDate(document) {
  const node = document.querySelector('meta[property="article:modified_time"], meta[name="modified"], time[datetime]');
  if (!node) return null;
  const value = node.getAttribute('content') || node.getAttribute('datetime');
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Date.now() - parsed.getTime() <= 1000 * 60 * 60 * 24 * 120;
}

function countVagueStatements(text, wordCount) {
  if (!wordCount) return 0;
  const matches = text.match(/\b(maybe|possibly|might|could|appears|roughly)\b/gi) ?? [];
  return matches.length / wordCount;
}

function textHasFirstPartySignals(text) {
  return /\bour data\b|\bour research\b|\binternal findings\b/i.test(text);
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

function getIntroSample(text) {
  return text.split(/\s+/).slice(0, 100).join(' ');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
