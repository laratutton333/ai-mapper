const SEO_RULES = [
  {
    id: 'schemaNews',
    text: 'Add NewsArticle schema markup so AI news surfaces recognize this release.',
    priority: '🎯 Critical',
    condition: (metrics, ctx) => ctx.contentType === 'pressRelease' && !metrics.schemaTypes.includes('NewsArticle'),
  },
  {
    id: 'schemaFaq',
    text: 'Add FAQ schema to unlock multi-framework visibility for conversational queries.',
    priority: 'High',
    condition: (metrics, ctx) => ['blogArticle', 'productPage', 'howTo'].includes(ctx.contentType) && !metrics.schemaTypes.includes('FAQPage'),
  },
  {
    id: 'productSchema',
    text: 'Include Product schema with Offer data for richer shopping experiences.',
    priority: 'High',
    condition: (metrics, ctx) => ctx.contentType === 'productPage' && !metrics.schemaTypes.includes('Product'),
  },
  {
    id: 'titleLength',
    text: 'Optimize the title tag to 50–60 characters for SERP pixel control.',
    priority: 'Medium',
    condition: (metrics, ctx) =>
      ctx.contentType !== 'pressRelease' && metrics.titleLength && (metrics.titleLength < 50 || metrics.titleLength > 60),
  },
  {
    id: 'metaDescription',
    text: 'Rewrite the meta description to 150–160 characters with a clear CTA.',
    priority: 'Medium',
    condition: (metrics) => metrics.metaLength && (metrics.metaLength < 140 || metrics.metaLength > 170),
  },
  {
    id: 'keywordIntro',
    text: 'Introduce the dominant keyword within the first 100 words.',
    priority: 'High',
    condition: (metrics) => metrics.keywordInIntro === false,
  },
  {
    id: 'internalLinks',
    text: 'Add internal links to supporting assets to lift crawl depth and topical authority.',
    priority: 'Medium',
    condition: (metrics) => metrics.linkCount < 3,
  },
  {
    id: 'speed',
    text: 'Improve page load speed by compressing media and deferring heavy scripts.',
    priority: 'High',
    condition: (metrics, ctx) =>
      ctx.contentType === 'pressRelease' ? metrics.pageSpeedEstimate < 65 : metrics.pageSpeedEstimate < 75,
  },
  {
    id: 'wordCount',
    text: 'Expand the narrative beyond 800 words to increase depth and SERP coverage.',
    priority: 'Medium',
    condition: (metrics) => metrics.wordCount < 800,
  },
];

const GEO_RULES = [
  {
    id: 'entityDefinitions',
    text: 'Add explicit entity definitions (“X is a…”) within the opening section for AI clarity.',
    priority: '🎯 Critical',
    condition: (metrics) => metrics.entityDefinitions < 2,
  },
  {
    id: 'infoDensity',
    text: 'Increase information density above 5% by layering in stats, dates, and data points.',
    priority: 'High',
    condition: (metrics) => metrics.factsPer100 < 5,
  },
  {
    id: 'qaFormat',
    text: 'Convert key talking points into a mini Q&A block to mimic prompt-ready snippets.',
    priority: 'High',
    condition: (metrics, ctx) => ctx.contentType !== 'pressRelease' && metrics.qaCount < 3,
  },
  {
    id: 'conversationalTone',
    text: 'Infuse more conversational markers (“you”, “we”, natural questions) for GEO tone.',
    priority: 'Medium',
    condition: (metrics, ctx) => ctx.contentType !== 'pressRelease' && metrics.conversationalMarkers < 10,
  },
  {
    id: 'quotable',
    text: 'Craft quotable soundbites under 20 words with attribution for AI citation.',
    priority: 'Medium',
    condition: (metrics) => metrics.quotableStatementsRatio < 0.4,
  },
  {
    id: 'attribution',
    text: 'Add clear attribution (“Name, Title said…”) to boost trust and citation readiness.',
    priority: 'Medium',
    condition: (metrics, ctx) =>
      ctx.contentType === 'pressRelease' ? metrics.attributionCount < 1 : metrics.attributionCount < 2,
  },
  {
    id: 'voiceSearch',
    text: 'Add voice-search friendly questions beginning with who/what/when/where/why/how.',
    priority: 'High',
    condition: (metrics, ctx) => ctx.contentType !== 'pressRelease' && metrics.voicePatternScore < 70,
  },
  {
    id: 'parserStructure',
    text: 'Structure listings with bullets, numbered steps, and short paragraphs for AI parsers.',
    priority: 'Medium',
    condition: (metrics) => metrics.parserAccessibilityScore < 75,
  },
  {
    id: 'authority',
    text: 'Layer in proprietary data or POV to strengthen topical authority signals.',
    priority: 'High',
    condition: (metrics, ctx) => {
      if (ctx.contentType === 'pressRelease') {
        return !(metrics.attributionCount >= 1 || metrics.hasProprietaryData || metrics.factsPer100 >= 8);
      }
      return metrics.topicalAuthorityScore < 55 && !metrics.hasProprietaryData;
    },
  },
];

const TYPE_SPECIFIC = {
  pressRelease: [
    'Host the release on an owned domain (/news or /media-center) to retain equity.',
    'Mirror the boilerplate copy across every release for brand consistency.',
    'Add outbound links to executive LinkedIn or Crunchbase profiles.',
    'Enable IndexNow submissions for immediate AI indexing.',
    'Publish proprietary benchmarks or data points within the announcement.',
  ],
  blogArticle: [
    'Add FAQ schema and conversational H2s that mirror natural queries.',
    'Call out author credentials and byline to reinforce expertise.',
    'Include a TL;DR summary at the top for fast AI referencing.',
  ],
  productPage: [
    'Structure specifications inside tables or definition lists for easy extraction.',
    'Add comparison/alternative language to help AI summarize positioning.',
    'Ensure pricing and availability are explicit near the top.',
  ],
  landingPage: [
    'Front-load the value proposition and CTA before the fold.',
    'Showcase trust signals (logos, awards, testimonials) near CTAs.',
    'Use conversational headings that map to intent-based prompts.',
  ],
  newsArticle: [
    'Cite primary sources with outbound links and timestamps.',
    'Include reporter name, publication date, and update cadence.',
    'Highlight at least one quotable insight per section.',
  ],
  howTo: [
    'Add HowTo schema with structured steps and estimated completion time.',
    'Include troubleshooting or “what could go wrong” sections.',
    'Provide materials/tools lists formatted as bullet points.',
  ],
};

export function buildRecommendations(metrics, ctx) {
  const seo = SEO_RULES.filter((rule) => rule.condition(metrics, ctx)).map((rule) => ({
    ...rule,
    mode: 'seo',
  }));
  const geo = GEO_RULES.filter((rule) => rule.condition(metrics, ctx)).map((rule) => ({
    ...rule,
    mode: 'geo',
  }));

  const combined = [...seo, ...geo].slice(0, 10);

  // Fallback suggestions if no rules triggered
  if (combined.length === 0) {
    combined.push({
      id: 'maintain',
      text: 'Maintain current optimization approach — both SEO and GEO pillars score within benchmark range.',
      priority: 'Maintain',
      mode: 'combined',
    });
  }

  return {
    combined,
    seo: seo.length ? seo : combined.filter((item) => item.mode === 'seo'),
    geo: geo.length ? geo : combined.filter((item) => item.mode === 'geo'),
  };
}

export function getTypeSpecificFindings(contentType, metrics = {}) {
  const base = TYPE_SPECIFIC[contentType] ?? [];
  if (contentType === 'pressRelease') {
    return base.filter((tip) => {
      if (tip.startsWith('Host the release') && metrics.likelyOwnedDomain) return false;
      if (tip.includes('proprietary') && metrics.hasProprietaryData) return false;
      return true;
    });
  }
  return base;
}
