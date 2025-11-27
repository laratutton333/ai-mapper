export const SEO_RULES = [
  {
    id: 'schemaNews',
    text: 'Add NewsArticle schema markup so AI news surfaces recognize this release.',
    priority: 'Critical',
    conditionId: 'schemaNews',
  },
  {
    id: 'schemaFaq',
    text: 'Add FAQ schema to unlock multi-framework visibility for conversational queries.',
    priority: 'High Priority',
    conditionId: 'schemaFaq',
  },
  {
    id: 'productSchema',
    text: 'Include Product schema with Offer data for richer shopping experiences.',
    priority: 'High Priority',
    conditionId: 'productSchema',
  },
  {
    id: 'titleLength',
    text: 'Optimize the title tag to 50–60 characters for SERP pixel control.',
    priority: 'Medium Priority',
    conditionId: 'titleLength',
  },
  {
    id: 'metaDescription',
    text: 'Rewrite the meta description to 150–160 characters with a clear CTA.',
    priority: 'Medium Priority',
    conditionId: 'metaDescription',
  },
  {
    id: 'keywordIntro',
    text: 'Introduce the dominant keyword within the first 100 words.',
    priority: 'High Priority',
    conditionId: 'keywordIntro',
  },
  {
    id: 'internalLinks',
    text: 'Add internal links to supporting assets to lift crawl depth and topical authority.',
    priority: 'Medium Priority',
    conditionId: 'internalLinks',
  },
  {
    id: 'speed',
    text: 'Improve page load speed by compressing media and deferring heavy scripts.',
    priority: 'High Priority',
    conditionId: 'pageSpeed',
  },
  {
    id: 'wordCount',
    text: 'Expand the narrative beyond 800 words to increase depth and SERP coverage.',
    priority: 'Medium Priority',
    conditionId: 'wordCount',
  },
];

export const GEO_RULES = [
  {
    id: 'entityDefinitions',
    text: 'Add explicit entity definitions (“X is a…”) within the opening section for AI clarity.',
    priority: 'Critical',
    conditionId: 'entityDefinitions',
  },
  {
    id: 'infoDensity',
    text: 'Increase information density above 5% by layering in stats, dates, and data points.',
    priority: 'High Priority',
    conditionId: 'infoDensity',
  },
  {
    id: 'qaFormat',
    text: 'Convert key talking points into a mini Q&A block to mimic prompt-ready snippets.',
    priority: 'High Priority',
    conditionId: 'qaFormat',
  },
  {
    id: 'conversationalTone',
    text: 'Infuse more conversational markers (“you”, “we”, natural questions) for GEO tone.',
    priority: 'Medium Priority',
    conditionId: 'conversationalTone',
  },
  {
    id: 'quotable',
    text: 'Craft quotable soundbites under 20 words with attribution for AI citation.',
    priority: 'Medium Priority',
    conditionId: 'quotable',
  },
  {
    id: 'attribution',
    text: 'Add clear attribution (“Name, Title said…”) to boost trust and citation readiness.',
    priority: 'Medium Priority',
    conditionId: 'attribution',
  },
  {
    id: 'voiceSearch',
    text: 'Add voice-search friendly questions beginning with who/what/when/where/why/how.',
    priority: 'High Priority',
    conditionId: 'voiceSearch',
  },
  {
    id: 'parserStructure',
    text: 'Structure listings with bullets, numbered steps, and short paragraphs for AI parsers.',
    priority: 'Medium',
    conditionId: 'parserStructure',
  },
  {
    id: 'authority',
    text: 'Layer in proprietary data or POV to strengthen topical authority signals.',
    priority: 'High',
    conditionId: 'authority',
  },
];

export const TYPE_SPECIFIC_TIPS = {
  pressRelease: [
    {
      id: 'pressHostOwned',
      text: 'Host the release on an owned domain (/news or /media-center) to retain equity.',
      conditionId: 'pressHostOwned',
    },
    {
      id: 'pressBoilerplate',
      text: 'Mirror the boilerplate copy across every release for brand consistency.',
    },
    {
      id: 'pressOutboundLinks',
      text: 'Add outbound links to executive LinkedIn or Crunchbase profiles.',
    },
    {
      id: 'pressIndexNow',
      text: 'Enable IndexNow submissions for immediate AI indexing.',
    },
    {
      id: 'pressProprietary',
      text: 'Publish proprietary benchmarks or data points within the announcement.',
      conditionId: 'pressProprietary',
    },
  ],
  blogArticle: [
    { id: 'blogFaq', text: 'Add FAQ schema and conversational H2s that mirror natural queries.' },
    { id: 'blogAuthor', text: 'Call out author credentials and byline to reinforce expertise.' },
    { id: 'blogTldr', text: 'Include a TL;DR summary at the top for fast AI referencing.' },
  ],
  productPage: [
    { id: 'productSpecs', text: 'Structure specifications inside tables or definition lists for easy extraction.' },
    { id: 'productComparison', text: 'Add comparison/alternative language to help AI summarize positioning.' },
    { id: 'productPricing', text: 'Ensure pricing and availability are explicit near the top.' },
  ],
  landingPage: [
    { id: 'landingValue', text: 'Front-load the value proposition and CTA before the fold.' },
    { id: 'landingTrust', text: 'Showcase trust signals (logos, awards, testimonials) near CTAs.' },
    { id: 'landingHeadings', text: 'Use conversational headings that map to intent-based prompts.' },
  ],
  newsArticle: [
    { id: 'newsSources', text: 'Cite primary sources with outbound links and timestamps.' },
    { id: 'newsMetadata', text: 'Include reporter name, publication date, and update cadence.' },
    { id: 'newsQuote', text: 'Highlight at least one quotable insight per section.' },
  ],
  howTo: [
    { id: 'howtoSchema', text: 'Add HowTo schema with structured steps and estimated completion time.' },
    { id: 'howtoTroubleshoot', text: 'Include troubleshooting or “what could go wrong” sections.' },
    { id: 'howtoMaterials', text: 'Provide materials/tools lists formatted as bullet points.' },
  ],
};
