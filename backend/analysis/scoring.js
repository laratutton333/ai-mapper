const SEO_RULES = [
  {
    id: 'titleLength',
    label: 'Title length',
    category: 'technical',
    maxPoints: 8,
    evaluate: (metrics) => {
      const length = metrics.titleLength ?? 0;
      if (length >= 45 && length <= 60) return { points: 8 };
      if ((length >= 30 && length < 45) || (length > 60 && length <= 70)) return { points: 4 };
      return { points: 0 };
    },
  },
  {
    id: 'metaDescription',
    label: 'Meta description',
    category: 'technical',
    maxPoints: 6,
    evaluate: (metrics) => ({ points: metrics.metaDescriptionPresent ? 6 : 0 }),
  },
  {
    id: 'h1Usage',
    label: 'H1 tag usage',
    category: 'technical',
    maxPoints: 6,
    evaluate: (metrics) => ({ points: metrics.h1Count === 1 ? 6 : 0 }),
  },
  {
    id: 'canonical',
    label: 'Canonical tag',
    category: 'technical',
    maxPoints: 5,
    evaluate: (metrics) => ({ points: metrics.canonicalPresent ? 5 : 0 }),
  },
  {
    id: 'wordCount',
    label: 'Word count',
    category: 'technical',
    maxPoints: 5,
    evaluate: (metrics) => {
      if (metrics.wordCount > 900) return { points: 5 };
      if (metrics.wordCount >= 300) return { points: 3 };
      return { points: 0 };
    },
  },
  {
    id: 'keywordIntro',
    label: 'Keyword in intro',
    category: 'content',
    maxPoints: 8,
    evaluate: (metrics) => ({ points: metrics.keywordInIntro ? 8 : 0 }),
  },
  {
    id: 'headingStructure',
    label: 'Heading structure quality',
    category: 'content',
    maxPoints: 6,
    evaluate: (metrics) => {
      if (metrics.headingStructureQuality === 'strong') return { points: 6 };
      if (metrics.headingStructureQuality === 'minor') return { points: 3 };
      return { points: 0 };
    },
  },
  {
    id: 'internalLinks',
    label: 'Internal links',
    category: 'content',
    maxPoints: 5,
    evaluate: (metrics) => {
      if (metrics.internalLinkCount >= 3) return { points: 5 };
      if (metrics.internalLinkCount >= 1) return { points: 3 };
      return { points: 0 };
    },
  },
  {
    id: 'altCoverage',
    label: 'Alt text coverage',
    category: 'content',
    maxPoints: 5,
    evaluate: (metrics) => {
      if (metrics.altCoverage > 0.8) return { points: 5 };
      if (metrics.altCoverage >= 0.3) return { points: 3 };
      return { points: 0 };
    },
  },
  {
    id: 'schemaPresence',
    label: 'Schema presence',
    category: 'content',
    maxPoints: 6,
    evaluate: (metrics) => ({ points: metrics.schemaTypes?.length ? 6 : 0 }),
  },
  {
    id: 'keywordDensity',
    label: 'Topical coverage',
    category: 'content',
    maxPoints: 5,
    evaluate: (metrics) => {
      const density = metrics.keywordDensity ?? 0;
      if (density >= 1 && density <= 2) return { points: 5 };
      if (density < 1) return { points: 2 };
      if (density > 2.5) return { points: 0 };
      return { points: 4 };
    },
  },
  {
    id: 'sentenceLength',
    label: 'Average sentence length',
    category: 'readability',
    maxPoints: 10,
    evaluate: (metrics) => {
      if (metrics.avgSentenceLength < 20) return { points: 10 };
      if (metrics.avgSentenceLength <= 25) return { points: 5 };
      return { points: 0 };
    },
  },
  {
    id: 'paragraphLength',
    label: 'Paragraph length',
    category: 'readability',
    maxPoints: 10,
    evaluate: (metrics) => {
      if (metrics.avgParagraphLength < 120) return { points: 10 };
      if (metrics.avgParagraphLength <= 180) return { points: 5 };
      return { points: 0 };
    },
  },
  {
    id: 'listPresence',
    label: 'Bullets or lists',
    category: 'readability',
    maxPoints: 10,
    evaluate: (metrics) => ({ points: metrics.listCount > 0 ? 10 : 0 }),
  },
];

const GEO_RULES = [
  { id: 'validSchema', label: 'Valid schema', category: 'structuredData', maxPoints: 6, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'structuredData', 'validSchema'), 6) },
  { id: 'correctSchemaType', label: 'Correct schema type', category: 'structuredData', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'structuredData', 'correctSchemaType'), 3) },
  { id: 'entityRelationships', label: 'Entity relationships defined', category: 'structuredData', maxPoints: 5, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'structuredData', 'entityRelationships'), 5) },
  { id: 'breadcrumbSchema', label: 'Breadcrumb schema', category: 'structuredData', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'structuredData', 'breadcrumbSchema'), 3) },
  { id: 'imageAuthorCitation', label: 'Image + author metadata', category: 'structuredData', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'structuredData', 'imageAuthorCitationMetadata'), 3) },
  { id: 'headingHierarchy', label: 'Heading hierarchy', category: 'contentClarity', maxPoints: 4, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'contentClarity', 'headingHierarchy'), 4) },
  { id: 'summaryTldr', label: 'Summary / TL;DR present', category: 'contentClarity', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'contentClarity', 'summaryTldrPresent'), 3) },
  { id: 'qaBlocks', label: 'Q&A blocks present', category: 'contentClarity', maxPoints: 4, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'contentClarity', 'qaBlocksPresent'), 4) },
  { id: 'shortParagraphs', label: 'Short chunked paragraphs', category: 'contentClarity', maxPoints: 4, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'contentClarity', 'shortChunkedParagraphs'), 4) },
  { id: 'listsTables', label: 'Lists / tables present', category: 'contentClarity', maxPoints: 5, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'contentClarity', 'listsTablesPresent'), 5) },
  { id: 'topicClusterLinks', label: 'Topic cluster internal links', category: 'entityArchitecture', maxPoints: 5, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'entityArchitecture', 'topicClusterInternalLinks'), 5) },
  { id: 'entityHubs', label: 'Canonical entity hubs', category: 'entityArchitecture', maxPoints: 4, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'entityArchitecture', 'canonicalEntityHubs'), 4) },
  { id: 'naturalAnchors', label: 'Natural anchor text', category: 'entityArchitecture', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'entityArchitecture', 'naturalAnchorText'), 3) },
  { id: 'cleanUrl', label: 'Clean URL structure', category: 'entityArchitecture', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'entityArchitecture', 'cleanUrlStructure'), 3) },
  { id: 'llmsTxt', label: 'llms.txt present', category: 'technicalGeo', maxPoints: 4, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'technicalGeo', 'llmsTxtPresent'), 4) },
  { id: 'robotsAllow', label: 'Robots allow LLM/Bing', category: 'technicalGeo', maxPoints: 2, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'technicalGeo', 'robotsAllowsLlm'), 2) },
  { id: 'indexNow', label: 'IndexNow key available', category: 'technicalGeo', maxPoints: 4, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'technicalGeo', 'indexnowKeyPresent'), 4) },
  { id: 'ssr', label: 'Server-side rendering', category: 'technicalGeo', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'technicalGeo', 'serverSideRendering'), 3) },
  { id: 'lightweightHtml', label: 'Lightweight HTML', category: 'technicalGeo', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'technicalGeo', 'lightweightHtml'), 3) },
  { id: 'sitemapLastmod', label: 'Sitemap lastmod accurate', category: 'technicalGeo', maxPoints: 2, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'technicalGeo', 'sitemapLastmodCorrect'), 2) },
  { id: 'statusCodes', label: 'Correct status codes', category: 'technicalGeo', maxPoints: 2, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'technicalGeo', 'correctStatusCodes'), 2) },
  {
    id: 'authorSchema',
    label: 'Author schema detected',
    category: 'authoritySignals',
    maxPoints: 4,
    evaluate: (metrics) => boolToPoints(getSignal(metrics, 'authoritySignals', 'authorSchema'), 4),
  },
  {
    id: 'authorBio',
    label: 'Author bio available',
    category: 'authoritySignals',
    maxPoints: 3,
    evaluate: (metrics) => boolToPoints(getSignal(metrics, 'authoritySignals', 'authorBioAvailable'), 3),
  },
  {
    id: 'externalCitations',
    label: 'Authoritative citations',
    category: 'authoritySignals',
    maxPoints: 3,
    evaluate: (metrics) => boolToPoints(getSignal(metrics, 'authoritySignals', 'externalAuthoritativeCitations'), 3),
  },
  {
    id: 'firstPartyData',
    label: 'First-party data present',
    category: 'authoritySignals',
    maxPoints: 3,
    evaluate: (metrics) => boolToPoints(getSignal(metrics, 'authoritySignals', 'firstPartyDataPresent'), 3),
  },
  {
    id: 'factualTone',
    label: 'Factual tone',
    category: 'authoritySignals',
    maxPoints: 2,
    evaluate: (metrics) => boolToPoints(getSignal(metrics, 'authoritySignals', 'factualTone'), 2),
  },
  { id: 'dateModified', label: 'Recent modified date', category: 'freshness', maxPoints: 3, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'freshness', 'dateModifiedRecent'), 3) },
  { id: 'currentContent', label: 'Current body content', category: 'freshness', maxPoints: 2, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'freshness', 'currentBodyContent'), 2) },
  { id: 'noContradictions', label: 'No contradictions', category: 'safety', maxPoints: 2, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'safety', 'noContradictions'), 2) },
  { id: 'disclaimers', label: 'Disclaimers present', category: 'safety', maxPoints: 2, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'safety', 'disclaimersPresent'), 2) },
  { id: 'noVagueStatements', label: 'No vague statements', category: 'safety', maxPoints: 1, evaluate: (metrics) => boolToPoints(getSignal(metrics, 'safety', 'noVagueStatements'), 1) },
];

export function computeSeoScore(metrics = {}, html = '') {
  return computeScore(SEO_RULES, metrics, html);
}

export function computeGeoScore(metrics = {}, html = '') {
  return computeScore(GEO_RULES, metrics, html);
}

function computeScore(rules, metrics, html) {
  let totalPoints = 0;
  let totalPossible = 0;
  const breakdown = {};

  for (const rule of rules) {
    const outcome = rule.evaluate(metrics, html) || { points: 0 };
    const points = clamp(outcome.points ?? 0, 0, rule.maxPoints);
    totalPoints += points;
    totalPossible += rule.maxPoints;
    breakdown[rule.id] = {
      id: rule.id,
      label: rule.label,
      category: rule.category,
      points,
      maxPoints: rule.maxPoints,
      passed: points === rule.maxPoints,
    };
  }

  const total = totalPossible ? Math.round((totalPoints / totalPossible) * 100) : 0;

  return {
    total,
    totalPoints,
    maxPoints: totalPossible,
    breakdown,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function boolToPoints(value, maxPoints) {
  if (value === null || value === undefined) return { points: 0 };
  return { points: value ? maxPoints : 0 };
}

function getSignal(metrics, category, key) {
  return metrics?.geoSignals?.[category]?.[key] ?? false;
}
