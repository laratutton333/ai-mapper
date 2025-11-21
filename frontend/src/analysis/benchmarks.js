export const INDUSTRY_BENCHMARKS = {
  technology: { name: 'Technology', seo: { min: 78, max: 85 }, geo: { min: 70, max: 78 } },
  financial: { name: 'Financial Services', seo: { min: 75, max: 82 }, geo: { min: 58, max: 65 } },
  healthcare: { name: 'Healthcare', seo: { min: 68, max: 75 }, geo: { min: 55, max: 62 } },
  retail: { name: 'Retail & E-commerce', seo: { min: 72, max: 80 }, geo: { min: 65, max: 72 } },
  manufacturing: { name: 'Manufacturing', seo: { min: 65, max: 73 }, geo: { min: 52, max: 60 } },
  media: { name: 'Media & Publishing', seo: { min: 80, max: 88 }, geo: { min: 68, max: 76 } },
  professional: { name: 'Professional Services', seo: { min: 70, max: 78 }, geo: { min: 60, max: 68 } },
  hospitality: { name: 'Hospitality & Travel', seo: { min: 74, max: 82 }, geo: { min: 62, max: 70 } },
  education: { name: 'Education', seo: { min: 66, max: 74 }, geo: { min: 58, max: 66 } },
  nonProfit: { name: 'Non-Profit', seo: { min: 62, max: 70 }, geo: { min: 54, max: 62 } },
};

const STATUS_MAP = [
  { threshold: 11, label: '📉 Well below average', className: 'risk' },
  { threshold: 6, label: '↘️ Below average', className: 'challenged' },
  { threshold: -5, label: '→ Average', className: '' },
  { threshold: -9, label: '↗️ Above average', className: '' }, // placeholder, overwritten below
];

export function summarizeBenchmark(score, industryRange) {
  if (!industryRange) {
    return { delta: 0, label: 'No benchmark', emoji: '', className: '' };
  }
  const avg = Math.round((industryRange.min + industryRange.max) / 2);
  const delta = score - avg;
  let label = '→ Average';
  let emoji = '→';
  let className = '';

  if (delta >= 10) {
    label = '📈 Well above average';
    emoji = '📈';
  } else if (delta >= 5) {
    label = '↗️ Above average';
    emoji = '↗️';
  } else if (delta <= -11) {
    label = '📉 Well below average';
    emoji = '📉';
    className = 'risk';
  } else if (delta <= -6) {
    label = '↘️ Below average';
    emoji = '↘️';
    className = 'challenged';
  }

  return { delta, label, emoji, className, average: avg };
}
