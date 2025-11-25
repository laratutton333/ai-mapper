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
  {
    id: 'answerIntro',
    label: 'Summary intro',
    category: 'directAnswer',
    maxPoints: 15,
    evaluate: (metrics) => {
      if (metrics.summaryQuality === 'strong') return { points: 15 };
      if (metrics.summaryQuality === 'partial') return { points: 8 };
      return { points: 0 };
    },
  },
  {
    id: 'definitionClarity',
    label: 'Definition clarity',
    category: 'directAnswer',
    maxPoints: 10,
    evaluate: (metrics) => {
      if (metrics.definitionClarity === 'clear') return { points: 10 };
      if (metrics.definitionClarity === 'partial') return { points: 5 };
      return { points: 0 };
    },
  },
  {
    id: 'snippetFormatting',
    label: 'Snippet-friendly formatting',
    category: 'directAnswer',
    maxPoints: 15,
    evaluate: (metrics) => {
      if (metrics.snippetFormatting === 'strong') return { points: 15 };
      if (metrics.snippetFormatting === 'partial') return { points: 8 };
      return { points: 0 };
    },
  },
  {
    id: 'qaStructure',
    label: 'Q&A structure',
    category: 'conversational',
    maxPoints: 15,
    evaluate: (metrics) => {
      if (metrics.qaCoverage === 'multiple') return { points: 15 };
      if (metrics.qaCoverage === 'single') return { points: 8 };
      return { points: 0 };
    },
  },
  {
    id: 'sectionAlignment',
    label: 'Section labeling',
    category: 'conversational',
    maxPoints: 15,
    evaluate: (metrics) => {
      if (metrics.sectionAlignment === 'strong') return { points: 15 };
      if (metrics.sectionAlignment === 'partial') return { points: 8 };
      return { points: 0 };
    },
  },
  {
    id: 'factualStatements',
    label: 'Factual statements',
    category: 'ingestion',
    maxPoints: 10,
    evaluate: (metrics) => {
      if (metrics.factualDensity >= 5) return { points: 10 };
      if (metrics.factualDensity >= 2) return { points: 5 };
      return { points: 0 };
    },
  },
  {
    id: 'redundancy',
    label: 'Redundancy control',
    category: 'ingestion',
    maxPoints: 10,
    evaluate: (metrics) => {
      if (metrics.redundancyScore >= 0.8) return { points: 10 };
      if (metrics.redundancyScore >= 0.6) return { points: 5 };
      return { points: 0 };
    },
  },
  {
    id: 'clarity',
    label: 'Clarity & simplicity',
    category: 'ingestion',
    maxPoints: 10,
    evaluate: (metrics) => {
      const readability = metrics.readabilityScore ?? 0;
      if (readability >= 60 && readability <= 80) return { points: 10 };
      if (readability >= 50 && readability < 60) return { points: 5 };
      return { points: 0 };
    },
  },
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
