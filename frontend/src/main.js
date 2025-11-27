import { INDUSTRY_BENCHMARKS, summarizeBenchmark } from './analysis/benchmarks.js';
import { applyIcons } from './icons.js';

// Prefer explicit global override (set window.AI_MAPPER_API_URL before loading this script)
// otherwise fall back to the deployed backend URL when running on Render or relative path locally.
const API_BASE = window.AI_MAPPER_API_URL || 'https://ai-mapper-backend.onrender.com';

const state = {
  inputType: 'url',
  mode: 'dual',
  recommendationView: 'combined',
  lastResult: null,
  activeDetailsId: null,
  activeDetailsTrigger: null,
  analysisState: 'idle',
  drawerOpen: false,
};

const analysisWorker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

function runAnalysisWorker(payload) {
  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      cleanup();
      resolve(event.data);
    };
    const handleError = (event) => {
      cleanup();
      reject(event instanceof ErrorEvent ? new Error(event.message) : event);
    };
    const cleanup = () => {
      analysisWorker.removeEventListener('message', handleMessage);
      analysisWorker.removeEventListener('error', handleError);
    };

    analysisWorker.addEventListener('message', handleMessage, { once: true });
    analysisWorker.addEventListener('error', handleError, { once: true });
    const transferablePayload =
      typeof structuredClone === 'function' ? structuredClone(payload) : JSON.parse(JSON.stringify(payload));
    analysisWorker.postMessage(transferablePayload);
  });
}

const COLLAPSE_DESKTOP_BREAKPOINT = 1280;
let collapsibleToggles = [];
let collapseMode = null;
let supportsHover = window.matchMedia('(hover: hover)').matches;
const hoverMediaQuery = window.matchMedia('(hover: hover)');
hoverMediaQuery.addEventListener('change', (event) => {
  supportsHover = event.matches;
});

const elements = {
  urlField: document.getElementById('url-field'),
  htmlField: document.getElementById('html-field'),
  textField: document.getElementById('text-field'),
  urlInput: document.getElementById('urlInput'),
  htmlInput: document.getElementById('htmlInput'),
  textInput: document.getElementById('textInput'),
  contentType: document.getElementById('contentType'),
  industry: document.getElementById('industrySelect'),
  statusBanner: document.getElementById('statusBanner'),
  stickyHeader: document.getElementById('stickyHeader'),
  stickySeoScore: document.getElementById('stickySeoScore'),
  stickyGeoScore: document.getElementById('stickyGeoScore'),
  stickyAnalyzeBtn: document.getElementById('stickyAnalyzeBtn'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  resetBtn: document.getElementById('resetBtn'),
  exportBtn: document.getElementById('exportBtn'),
  seoScore: document.getElementById('seoScore'),
  geoScore: document.getElementById('geoScore'),
  seoStatusBadge: document.getElementById('seoScoreStatus'),
  geoStatusBadge: document.getElementById('geoScoreStatus'),
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
  seoPillars: document.getElementById('seoPillars'),
  geoPillars: document.getElementById('geoPillars'),
  seoBreakdownScore: document.getElementById('seoBreakdownScore'),
  geoBreakdownScore: document.getElementById('geoBreakdownScore'),
  performanceScore: document.getElementById('performanceScoreValue'),
  performanceGrid: document.getElementById('performanceGrid'),
  bingChecks: document.getElementById('bingChecksList'),
  inputPanel: document.querySelector('.input-panel'),
  resultsPanel: document.querySelector('.results-panel'),
  emptyState: document.getElementById('emptyState'),
  resultsContainer: document.getElementById('results-container'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  detailsPanel: document.getElementById('details-panel'),
  detailsBackdrop: document.getElementById('details-backdrop'),
  detailsPanelTitle: document.getElementById('detailsPanelTitle'),
  detailsPanelSummary: document.getElementById('detailsPanelSummary'),
  detailsPanelBody: document.getElementById('detailsPanelBody'),
  detailsPanelCloseBtn: document.getElementById('detailsPanelCloseBtn'),
  skeletons: {
    seoScore: document.getElementById('seoScoreSkeleton'),
    geoScore: document.getElementById('geoScoreSkeleton'),
    performance: document.getElementById('performanceSkeleton'),
    seoPillars: document.getElementById('seoPillarsSkeleton'),
    geoPillars: document.getElementById('geoPillarsSkeleton'),
    recommendations: document.getElementById('recommendationsSkeleton'),
    snapshot: document.getElementById('snapshotSkeleton'),
  },
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
  if (state.lastResult && state.analysisState === 'done') {
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
initStickyHeader();
initCollapsibleControls();
initDetailsPanel();
updateStickyScores('--', '--');
setAnalysisState('idle');
setExportVisibility(false);
applyIcons();

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

// --- FIX: spinner state logic ---
function startLoading() {
  elements.loadingSpinner?.classList.remove('hidden');
}

function stopLoading() {
  elements.loadingSpinner?.classList.add('hidden');
}

function getStatusClass(status) {
  if (!status) return 'status-neutral';
  switch (status.toLowerCase().trim()) {
    case 'strong':
      return 'status-strong';
    case 'watch':
      return 'status-watch';
    case 'risk':
      return 'status-risk';
    default:
      return 'status-neutral';
  }
}

function showStatus(message = '', variant = 'info') {
  if (!elements.statusBanner) return;
  if (!message) {
    elements.statusBanner.textContent = '';
    elements.statusBanner.className = 'status-banner hidden';
    return;
  }
  elements.statusBanner.textContent = message;
  elements.statusBanner.className = `status-banner status-banner--${variant}`;
}

function initStickyHeader() {
  if (!elements.stickyHeader) return;
  elements.stickyAnalyzeBtn?.addEventListener('click', () => {
    if (!elements.stickyAnalyzeBtn.disabled) {
      handleAnalyze();
    }
  });

  const computeThreshold = () => {
    if (!elements.inputPanel) return 300;
    const rect = elements.inputPanel.getBoundingClientRect();
    return rect.top + window.scrollY + elements.inputPanel.offsetHeight;
  };

  let stickyThreshold = computeThreshold();
  const evaluateSticky = () => {
    if (!elements.stickyHeader) return;
    const show = window.scrollY > stickyThreshold;
    elements.stickyHeader.classList.toggle('sticky-header--visible', show);
  };

  window.addEventListener(
    'scroll',
    () => {
      evaluateSticky();
    },
    { passive: true }
  );
  window.addEventListener('resize', () => {
    stickyThreshold = computeThreshold();
    evaluateSticky();
  });
  evaluateSticky();
}

function updateStickyScores(seoScore, geoScore) {
  if (!elements.stickySeoScore || !elements.stickyGeoScore) return;
  elements.stickySeoScore.textContent = Number.isFinite(seoScore) ? `${seoScore}` : '--';
  elements.stickyGeoScore.textContent = Number.isFinite(geoScore) ? `${geoScore}` : '--';
}

function initCollapsibleControls() {
  collapsibleToggles = Array.from(document.querySelectorAll('[data-collapse-target]'));
  if (!collapsibleToggles.length) return;
  collapsibleToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      if (window.innerWidth >= COLLAPSE_DESKTOP_BREAKPOINT) return;
      toggleCollapsible(toggle);
    });
  });
  window.addEventListener('resize', () => handleCollapsibleResize());
  handleCollapsibleResize(true);
}

function toggleCollapsible(toggle, forceState) {
  const targetId = toggle?.dataset?.collapseTarget;
  const panel = targetId ? document.getElementById(targetId) : null;
  if (!panel) return;
  const shouldExpand = forceState !== undefined ? forceState : toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(shouldExpand));
  panel.classList.toggle('collapsible-panel--open', shouldExpand);
}

function handleCollapsibleResize(force = false) {
  if (!collapsibleToggles.length) return;
  const isDesktop = window.innerWidth >= COLLAPSE_DESKTOP_BREAKPOINT;
  const mode = isDesktop ? 'desktop' : 'mobile';
  if (!force && mode === collapseMode) return;
  collapseMode = mode;
  collapsibleToggles.forEach((toggle) => {
    toggle.classList.toggle('collapsible-toggle--locked', isDesktop);
    toggleCollapsible(toggle, isDesktop);
  });
}

function initDetailsPanel() {
  if (!elements.detailsPanel) return;
  document.addEventListener('click', handleDetailsTriggerEvent);
  elements.detailsPanelCloseBtn?.addEventListener('click', () => closeDetailsPanel());
  elements.detailsBackdrop?.addEventListener('click', () => closeDetailsPanel());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDetailsPanel();
    }
  });
}

function setResultsVisibility(hasResults) {
  if (!elements.resultsContainer) return;
  elements.resultsContainer.classList.toggle('results-container--visible', Boolean(hasResults));
}

// --- FIX: sticky header CTA ---
function updateStickyHeader(hasResults, drawerOpen = false) {
  if (!elements.stickyHeader) return;
  const show = hasResults && !drawerOpen && state.analysisState === 'done';
  elements.stickyHeader.classList.toggle('hidden', !show);
}

function setExportVisibility(visible) {
  if (!elements.exportBtn) return;
  elements.exportBtn.classList.toggle('hidden', !visible);
}

function setSkeletonVisibility(isVisible) {
  const method = isVisible ? 'add' : 'remove';
  Object.values(elements.skeletons).forEach((node) => {
    if (!node) return;
    node.classList[method]('skeleton-visible');
  });
  document.querySelectorAll('.score-card, .pillar-grid, .recommendation-list, .snapshot-grid, .performance-grid').forEach((node) => {
    node.classList.toggle('is-loading', isVisible);
  });
}

/* ANALYSIS ----------------------------------------------------------------- */
async function handleAnalyze() {
  const ctx = {
    inputType: state.inputType,
    contentType: elements.contentType.value,
    industry: elements.industry.value,
    url: elements.urlInput.value.trim(),
    analysisMode: state.mode,
  };

  setAnalysisState('loading');
  setSkeletonVisibility(true);
  let fetchedResult = null;
  try {
    const payload = buildAnalysisPayload(ctx);
    fetchedResult = await runAnalysis(payload);
    const html = fetchedResult.html ?? '';
    if (!html && ctx.inputType !== 'text') {
      throw new Error('Analysis returned no HTML. Please try another input.');
    }
    const derivedText =
      ctx.inputType === 'text' ? elements.textInput.value.trim() : htmlToText(html);
    const structuralMetrics = analyzeStructure(html, ctx.inputType, ctx.url);
    const workerPayload = {
      text: derivedText,
      structuralMetrics,
      performance: fetchedResult.performance ?? null,
      settings: {
        inputType: ctx.inputType,
        url: ctx.url,
        contentType: ctx.contentType,
      },
    };
    const workerResult = await runAnalysisWorker(workerPayload);
    if (workerResult?.error) {
      throw new Error(workerResult.error);
    }
    const combined = {
      ...fetchedResult,
      ...workerResult,
    };
    combined.seoPillars = buildSeoPillars(fetchedResult.seoBreakdown ?? {});
    combined.geoPillars = buildGeoPillars(fetchedResult.geoBreakdown ?? {});
    state.lastResult = combined;
    setAnalysisState('done');
    renderResults(combined);
    showStatus('Analysis complete. Review the cards below for insights.', 'success');
  } catch (error) {
    console.error(error);
    if (error.code === 'subscription_required') {
      showSubscriptionModal();
      const message = 'Subscription required to continue analyzing content.';
      showStatus(message, 'error');
      updateSnapshot(message);
    } else {
      const friendly = error.message ?? 'Unable to analyze content.';
      showStatus(friendly, 'error');
      updateSnapshot(`Unable to analyze content.\nReason: ${friendly}`);
    }
    setAnalysisState('error');
    if (!state.lastResult) {
      setExportVisibility(false);
    }
  } finally {
    setSkeletonVisibility(false);
  }
}

function setAnalysisState(nextState = 'idle') {
  state.analysisState = nextState;
  const isLoading = nextState === 'loading';
  const isDone = nextState === 'done';
  const isIdle = nextState === 'idle';
  const shouldShowResults = nextState === 'done';
  const shouldShowEmpty = isIdle;

  elements.analyzeBtn.disabled = isLoading;
  elements.analyzeBtn.textContent = isLoading ? 'Analyzing…' : 'Run AI Mapper Analysis';
  if (elements.stickyAnalyzeBtn) {
    elements.stickyAnalyzeBtn.disabled = isLoading;
    elements.stickyAnalyzeBtn.textContent = isLoading ? 'Analyzing…' : 'Run AI Mapper Analysis';
  }
  elements.emptyState?.classList.toggle('hidden', !shouldShowEmpty);
  setResultsVisibility(shouldShowResults);
  if (isLoading) {
    startLoading();
    showStatus('Analyzing content…', 'info');
    closeDetailsPanel({ silent: true });
  } else {
    stopLoading();
  }
  if (loadingOverlay) {
    loadingOverlay.classList.toggle('loading-overlay--visible', isLoading);
    loadingOverlay?.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
  }
  updateStickyHeader(isDone ? Boolean(state.lastResult) : false, state.drawerOpen);
}

function buildAnalysisPayload(ctx) {
  const basePayload = {
    mode: ctx.inputType,
    analysisMode: ctx.analysisMode,
    contentType: ctx.contentType,
    industry: ctx.industry,
  };

  if (ctx.inputType === 'url') {
    if (!ctx.url) throw new Error('Please provide a URL to analyze.');
    return { ...basePayload, url: ctx.url, content: ctx.url };
  }
  if (ctx.inputType === 'html') {
    const html = elements.htmlInput.value.trim();
    if (!html) throw new Error('Paste HTML source to analyze.');
    return { ...basePayload, html, content: html };
  }
  const text = elements.textInput.value.trim();
  if (!text) throw new Error('Paste text content to analyze.');
  return { ...basePayload, text, content: text };
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
    microsoftBingChecks: data.microsoftBingChecks ?? null,
  };
}

/* RENDERING ---------------------------------------------------------------- */
function renderResults(result) {
  if (state.analysisState !== 'done') return;
  closeDetailsPanel({ silent: true });
  const {
    seoScore,
    geoScore,
    recommendations,
    typeFindings,
    metrics,
    performance,
    performanceNormalized,
    microsoftBingChecks,
  } = result;
  const { seoPillars = [], geoPillars = [] } = result;
  elements.seoScore.textContent = Number.isFinite(seoScore) ? `${seoScore}` : '--';
  elements.geoScore.textContent = Number.isFinite(geoScore) ? `${geoScore}` : '--';
  updateStickyScores(seoScore, geoScore);

  const gap = Math.abs(seoScore - geoScore);
  elements.gapScore.textContent = `${gap}`;
  let narrative = 'Balanced performance across SEO and GEO.';
  if (gap >= 20) {
    narrative = `${seoScore > geoScore ? 'Focus on GEO improvements.' : 'Traditional SEO basics need attention.'}`;
  } else if (gap >= 10) {
    narrative = 'Moderate gap. Prioritize cross-framework actions.';
  }
  elements.gapNarrative.textContent = narrative;

  renderPillars(seoPillars, geoPillars, seoScore, geoScore);
  renderRecommendations(recommendations);
  renderTypeSpecific(typeFindings);
  renderPerformance(performanceNormalized ?? performance);
  renderMicrosoftChecks(microsoftBingChecks);
  updateBenchmarks(result);
  renderSnapshotTable(result);
  updateStatusBadge(elements.seoStatusBadge, classifyScore(seoScore));
  updateStatusBadge(elements.geoStatusBadge, classifyScore(geoScore));
  applyIcons(elements.resultsContainer);
  setExportVisibility(true);
  setSkeletonVisibility(false);
}

function renderPillars(seoPillars = [], geoPillars = [], seoScore = 0, geoScore = 0) {
  if (elements.seoBreakdownScore) {
    elements.seoBreakdownScore.textContent = Number.isFinite(seoScore) ? `${seoScore}` : '--';
  }
  if (elements.geoBreakdownScore) {
    elements.geoBreakdownScore.textContent = Number.isFinite(geoScore) ? `${geoScore}` : '--';
  }
  renderPillarSection(elements.seoPillars, seoPillars);
  renderPillarSection(elements.geoPillars, geoPillars);
}

function renderPillarSection(container, list = []) {
  if (!container) return;
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = '<p class="empty-copy">No data yet.</p>';
    return;
  }
  list.forEach((pillar) => {
    const status = classifyScore(pillar.score);
    const detailsId = `pillar-details-${pillar.id}`;
    const card = document.createElement('article');
    card.className = 'pillar-card hover-card';
    card.dataset.pillarId = pillar.id;

    const header = document.createElement('div');
    header.className = 'pillar-card__header';

    const title = document.createElement('h3');
    title.textContent = pillar.label;

    const statusWrapper = document.createElement('div');
    statusWrapper.className = 'pillar-card__status';

    const badge = document.createElement('span');
    badge.className = `status-pill ${getStatusClass(status.label)}`;
    badge.textContent = status.label;
    badge.tabIndex = 0;
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', `${pillar.label} status: ${status.label}`);

    const detailsButton = document.createElement('button');
    detailsButton.className = 'details-pill view-details-button';
    detailsButton.type = 'button';
    detailsButton.dataset.detailsTarget = detailsId;
    detailsButton.dataset.pillarName = pillar.label;
    detailsButton.dataset.pillarSummary = pillar.description;
    detailsButton.setAttribute('aria-expanded', 'false');
    detailsButton.setAttribute('aria-controls', 'details-panel');
    detailsButton.textContent = 'View Details';

    statusWrapper.append(badge, detailsButton);

    const tooltip = document.createElement('div');
    tooltip.className = 'status-tooltip';
    tooltip.innerHTML = `
      <p>${status.message}</p>
      <button type="button" class="status-tooltip__link view-details-button" data-details-target="${detailsId}" data-pillar-name="${pillar.label}" data-pillar-summary="${pillar.description}">
        View Full Details →
      </button>
    `;
    statusWrapper.appendChild(tooltip);

    header.append(title, statusWrapper);

    const scoreWrap = document.createElement('div');
    scoreWrap.className = 'pillar-card__score-wrap card-content';
    const scoreValue = document.createElement('p');
    scoreValue.className = 'pillar-card__score pillar-score';
    scoreValue.textContent = Number.isFinite(pillar.score) ? `${Math.round(pillar.score)}` : '--';
    const summary = document.createElement('p');
    summary.className = 'pillar-card__summary pillar-summary details-preview';
    summary.textContent = pillar.description;
    scoreWrap.append(scoreValue, summary);

    const detailsContent = document.createElement('div');
    detailsContent.className = 'pillar-details-data';
    detailsContent.id = detailsId;
    detailsContent.hidden = true;
    const detailsList =
      pillar.notes && pillar.notes.length
        ? pillar.notes.map((note) => `<li>${note}</li>`).join('')
        : '<li>No checks evaluated.</li>';
    detailsContent.innerHTML = `<ul class="pillar-details-list">${detailsList}</ul>`;

    card.append(header, scoreWrap, detailsContent);
    container.appendChild(card);

    setupStatusTooltip(badge, tooltip);
  });
}

function setupStatusTooltip(badge, tooltip) {
  if (!badge || !tooltip || !supportsHover) return;
  const show = () => tooltip.classList.add('status-tooltip--visible');
  const hide = () => tooltip.classList.remove('status-tooltip--visible');
  badge.addEventListener('mouseenter', show);
  badge.addEventListener('mouseleave', hide);
  badge.addEventListener('focus', show);
  badge.addEventListener('blur', hide);
}

function updateStatusBadge(element, status) {
  if (!element || !status) return;
  element.textContent = status.label ?? '--';
  element.className = `status-pill ${getStatusClass(status.label)}`;
}

function handleDetailsTriggerEvent(event) {
  const trigger = event.target.closest('.view-details-button');
  if (!trigger) return;
  event.preventDefault();
  const detailsId = trigger.dataset.detailsTarget;
  if (!detailsId) return;
  openDetailsPanel(detailsId, trigger.dataset.pillarName, trigger.dataset.pillarSummary, trigger);
}

function openDetailsPanel(detailsId, title, summary, trigger) {
  if (!elements.detailsPanel || !detailsId) return;
  const source = document.getElementById(detailsId);
  if (!source) return;
  elements.detailsPanelBody.innerHTML = source.innerHTML;
  elements.detailsPanelTitle.textContent = title || 'Details';
  elements.detailsPanelSummary.textContent = summary || '';
  elements.detailsPanelBody.scrollTop = 0;
  elements.detailsPanel.classList.remove('hidden');
  elements.detailsBackdrop?.classList.remove('hidden');
  elements.detailsPanel.classList.add('open');
  elements.detailsBackdrop?.classList.add('open');
  elements.detailsPanel.setAttribute('aria-hidden', 'false');
  elements.detailsBackdrop?.setAttribute('aria-hidden', 'false');
  elements.detailsPanel.focus();
  state.activeDetailsId = detailsId;
  state.activeDetailsTrigger = trigger ?? null;
  state.drawerOpen = true;
  updateStickyHeader(Boolean(state.lastResult), true);
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'true');
  }
}

function closeDetailsPanel(options = {}) {
  if (!elements.detailsPanel) return;
  const wasOpen = elements.detailsPanel.classList.contains('open');
  elements.detailsPanel.classList.remove('open');
  elements.detailsBackdrop?.classList.remove('open');
  elements.detailsPanel.classList.add('hidden');
  elements.detailsBackdrop?.classList.add('hidden');
  elements.detailsPanel.setAttribute('aria-hidden', 'true');
  elements.detailsBackdrop?.setAttribute('aria-hidden', 'true');
  elements.detailsPanelBody.innerHTML = '';
  if (state.activeDetailsTrigger) {
    state.activeDetailsTrigger.setAttribute('aria-expanded', 'false');
    if (!options.silent && wasOpen) {
      state.activeDetailsTrigger.focus();
    }
  }
  state.activeDetailsId = null;
  state.activeDetailsTrigger = null;
  state.drawerOpen = false;
  updateStickyHeader(Boolean(state.lastResult), false);
}

function renderRecommendations(recommendations) {
  const view = state.recommendationView;
  const list =
    view === 'seo' ? recommendations.seo : view === 'geo' ? recommendations.geo : recommendations.combined;
  const groups = {
    critical: { label: 'Critical fixes', icon: 'flame', items: [] },
    high: { label: 'High priority', icon: 'zap', items: [] },
    medium: { label: 'Medium priority', icon: 'list', items: [] },
  };

  list.forEach((item) => {
    const bucket = classifyPriority(item.priority);
    groups[bucket].items.push(item);
  });

  elements.recommendationList.innerHTML = '';
  const order = ['critical', 'high', 'medium'];
  let appended = false;
  order.forEach((key) => {
    const group = groups[key];
    if (!group.items.length) return;
    appended = true;
    const wrapper = document.createElement('li');
    wrapper.className = 'recommendation-group';
    wrapper.innerHTML = `
      <p class="recommendation-group__title label-with-icon">
        <span data-icon="${group.icon}" data-label="${group.label}"></span>
        <span>${group.label}</span>
      </p>`;
    const sublist = document.createElement('ul');
    sublist.className = 'recommendation-group__list';
    group.items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'recommendation-item';
      const iconName = key === 'critical' ? 'flame' : key === 'high' ? 'zap' : 'list';
      li.innerHTML = `
        <span class="priority label-with-icon">
          <span data-icon="${iconName}" data-label="${item.priority}"></span>
          <span>${item.priority}</span>
        </span>
        <div>
          <p>${item.text}</p>
        </div>
      `;
      sublist.appendChild(li);
    });
    wrapper.appendChild(sublist);
    elements.recommendationList.appendChild(wrapper);
  });

  if (!appended) {
    const empty = document.createElement('li');
    empty.className = 'empty-copy';
    empty.textContent = 'No recommendations available.';
    elements.recommendationList.appendChild(empty);
  }
}

function classifyPriority(priority = '') {
  const value = priority.toLowerCase();
  if (value.includes('critical')) return 'critical';
  if (value.includes('high')) return 'high';
  return 'medium';
}

function renderTypeSpecific(list) {
  elements.typeSpecific.innerHTML = '';
  list.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    elements.typeSpecific.appendChild(li);
  });
}

function renderSnapshotTable(result) {
  if (!elements.snapshot || !result) return;
  const metrics = result.metrics ?? {};
  const meta = result.meta ?? {};
  const performanceScore = result.performance?.performanceScore;
  const rows = [
    { label: 'Input Type', value: meta.inputType ? meta.inputType.toUpperCase() : 'N/A' },
    { label: 'Input URL', value: meta.url || 'N/A' },
    { label: 'Schema', value: formatList(metrics.schemaTypes ?? meta.schema) },
    { label: 'Word Count', value: formatNumber(metrics.wordCount) },
    { label: 'Sentences', value: formatNumber(metrics.sentenceCount) },
    { label: 'Entities', value: formatNumber(metrics.entityDefinitions) },
    { label: 'Q&A Blocks', value: formatNumber(metrics.qaCount) },
    {
      label: 'Readability',
      value: Number.isFinite(metrics.readability ?? metrics.readabilityScore)
        ? (metrics.readability ?? metrics.readabilityScore).toFixed(1)
        : 'n/a',
    },
    {
      label: 'Facts / 100 Words',
      value: Number.isFinite(metrics.factsPer100 ?? metrics.factualDensity)
        ? (metrics.factsPer100 ?? metrics.factualDensity).toFixed(1)
        : 'n/a',
    },
    {
      label: 'Speed Snapshot Score',
      value: Number.isFinite(performanceScore) ? `${performanceScore}/100` : 'n/a',
    },
  ];

  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <th>${row.label}</th>
        <td>${row.value}</td>
      </tr>`
    )
    .join('');

  elements.snapshot.innerHTML = `
    <table class="snapshot-table">
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

// --- FIX: Speed Snapshot binding ---
function renderPerformance(performance) {
  if (!elements.performanceScore) return;
  const data = performance ?? state.lastResult?.performanceNormalized ?? null;
  if (!data) {
    elements.performanceScore.textContent = '--';
    const grid = ensurePerformanceGrid();
    if (grid) {
      grid.innerHTML = '<p class="empty-copy">URL fetching is required to display performance metrics.</p>';
    }
    return;
  }

  const scoreText = data.performanceScore !== null ? `${data.performanceScore}` : '--';
  elements.performanceScore.textContent = scoreText;
  const grades = data.grades ?? {};
  const gradeClass = {
    optimal: 'grade-badge--optimal',
    acceptable: 'grade-badge--acceptable',
    poor: 'grade-badge--poor',
  };

  const metricRows = [
    {
      label: 'Response time (ms)',
      value: data.responseTime ?? '--',
      grade: grades.responseTime ?? 'acceptable',
    },
    {
      label: 'Page size (KB)',
      value: data.pageSizeKB !== null ? `${data.pageSizeKB} KB` : '--',
      grade: grades.pageSize ?? 'acceptable',
    },
    {
      label: 'Number of requests',
      value: data.numRequests ?? '--',
      grade: grades.numRequests ?? 'acceptable',
    },
    {
      label: 'Largest image (KB)',
      value: data.largestImageKB !== null ? `${data.largestImageKB} KB` : '--',
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

  const grid = ensurePerformanceGrid();
  if (grid) {
    grid.innerHTML = template;
  }
}

function ensurePerformanceGrid() {
  if (elements.performanceGrid) {
    elements.performanceGrid.classList.remove('hidden');
    return elements.performanceGrid;
  }
  const section = document.getElementById('performancePanel');
  if (!section) return null;
  section.classList.remove('hidden');
  let grid = section.querySelector('.performance-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'performance-grid';
    grid.id = 'performanceGrid';
    section.appendChild(grid);
  }
  grid.classList.remove('hidden');
  elements.performanceGrid = grid;
  return grid;
}

function renderMicrosoftChecks(checks) {
  if (!elements.bingChecks) return;
  if (!checks) {
    elements.bingChecks.innerHTML = '<li class="empty-copy">Run an analysis to view verification status.</li>';
    return;
  }

  const items = [
    {
      id: 'meta',
      label: 'Meta msvalidate tag',
      value: checks.meta_msvalidate ? `Detected (${checks.meta_msvalidate})` : 'Missing',
      status: checks.meta_msvalidate,
    },
    {
      id: 'dns',
      label: 'DNS msvalidate TXT',
      value: checks.dns_msvalidate ?? 'Not found',
      status: Boolean(checks.dns_msvalidate),
    },
    {
      id: 'indexnow',
      label: 'IndexNow endpoint',
      value: checks.indexnow_endpoint ? 'Accessible' : 'Missing',
      status: checks.indexnow_endpoint,
    },
    {
      id: 'llms',
      label: 'llms.txt present',
      value: checks.llms_txt_present ? 'Detected' : 'Not detected',
      status: checks.llms_txt_present,
    },
    {
      id: 'bingbot',
      label: 'Bingbot allowed in robots.txt',
      value:
        checks.bingbot_allowed === null
          ? 'Unknown'
          : checks.bingbot_allowed
          ? checks.bingbot_disallow?.length
            ? `Allowed · Disallowed: ${checks.bingbot_disallow.join(', ')}`
            : 'Allowed'
          : 'Blocked or not specified',
      status: checks.bingbot_allowed === null ? false : checks.bingbot_allowed,
      warn: checks.bingbot_allowed === null,
    },
  ];

  elements.bingChecks.innerHTML = items
    .map((item) => {
      const statusClass = item.warn ? 'status-pill--warn' : item.status ? 'status-pill--pass' : 'status-pill--fail';
      const statusLabel = item.warn ? 'Unknown' : item.status ? 'Pass' : 'Missing';
      const iconName = item.warn ? 'infoCircle' : item.status ? 'shieldCheck' : 'flame';
      return `
        <li class="bing-check">
          <div class="bing-check__info label-with-icon">
            <span data-icon="${iconName}" data-label="${item.label}"></span>
            <span class="bing-check__label">${item.label}</span>
          </div>
          <span class="status-pill ${statusClass}">${statusLabel}</span>
          <p class="bing-check__note">${item.value}</p>
        </li>
      `;
    })
    .join('');
  applyIcons(elements.bingChecks);
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
  if (!elements.snapshot) return;
  elements.snapshot.innerHTML = `<p class="snapshot-message">${text}</p>`;
}

function showSubscriptionModal() {
  subscriptionModal?.classList.add('modal--visible');
}

function hideSubscriptionModal() {
  subscriptionModal?.classList.remove('modal--visible');
}

/* DOM-DEPENDENT HELPERS ---------------------------------------------------- */
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
    } catch {
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

function formatBytesToKB(bytes = 0) {
  const numeric = Number(bytes);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  const kb = numeric / 1024;
  return kb >= 100 ? Math.round(kb) : Number(kb.toFixed(1));
}

function formatNumber(value) {
  if (value === null || value === undefined) return 'n/a';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return number.toLocaleString();
}

function formatList(value) {
  if (Array.isArray(value) && value.length) {
    return value.join(', ');
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return 'None';
}

function formatBingChecksForExport(checks) {
  if (!checks) {
    return '<li>No Microsoft/Bing verification data available.</li>';
  }
  const map = [
    {
      label: 'Meta msvalidate tag',
      value: checks.meta_msvalidate ? `Detected (${checks.meta_msvalidate})` : 'Missing',
    },
    {
      label: 'DNS msvalidate TXT',
      value: checks.dns_msvalidate ?? 'Not found',
    },
    {
      label: 'IndexNow endpoint',
      value: checks.indexnow_endpoint ? 'Accessible' : 'Missing',
    },
    {
      label: 'llms.txt present',
      value: checks.llms_txt_present ? 'Detected' : 'Not detected',
    },
    {
      label: 'Bingbot allowed in robots.txt',
      value:
        checks.bingbot_allowed === null
          ? 'Unknown'
          : checks.bingbot_allowed
          ? checks.bingbot_disallow?.length
            ? `Allowed · Disallowed: ${checks.bingbot_disallow.join(', ')}`
            : 'Allowed'
          : 'Blocked or not specified',
    },
  ];
  return map.map((entry) => `<li>${entry.label}: ${entry.value}</li>`).join('\n');
}

function classifyScore(score) {
  const value = Number.isFinite(score) ? score : 0;
  if (value >= 80) {
    return {
      label: 'Strong',
      message: 'Signals are healthy with solid coverage across evaluated pillars.',
    };
  }
  if (value >= 60) {
    return {
      label: 'Watch',
      message: 'Mixed execution. Address highlighted checks before the gap widens.',
    };
  }
  return {
    label: 'Risk',
    message: 'Critical deficiencies reduce discoverability. Prioritize fixes immediately.',
  };
}

function resetForm() {
  closeDetailsPanel({ silent: true });
  elements.urlInput.value = '';
  elements.htmlInput.value = '';
  elements.textInput.value = '';
  updateSnapshot('Form reset. Add content and run analysis.');
  showStatus('', 'info');
  updateStickyScores('--', '--');
  updateStatusBadge(elements.seoStatusBadge, { label: null });
  updateStatusBadge(elements.geoStatusBadge, { label: null });
  state.lastResult = null;
  if (elements.seoPillars) elements.seoPillars.innerHTML = '';
  if (elements.geoPillars) elements.geoPillars.innerHTML = '';
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
  if (elements.seoBreakdownScore) elements.seoBreakdownScore.textContent = '--';
  if (elements.geoBreakdownScore) elements.geoBreakdownScore.textContent = '--';
  renderPerformance(null);
  renderMicrosoftChecks(null);
  elements.emptyState?.classList.remove('hidden');
  setAnalysisState('idle');
  stopLoading();
  setExportVisibility(false);
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
  const bingSection = formatBingChecksForExport(result.microsoftBingChecks);
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
<h2>SEO Breakdown</h2>
<ul>
${(result.seoPillars ?? [])
  .map((pillar) => `<li><strong>${pillar.label}</strong>: ${Math.round(pillar.score)} – ${pillar.description}</li>`)
  .join('\n')}
</ul>
<h2>GEO Breakdown</h2>
<ul>
${(result.geoPillars ?? [])
  .map((pillar) => `<li><strong>${pillar.label}</strong>: ${Math.round(pillar.score)} – ${pillar.description}</li>`)
  .join('\n')}
</ul>
<h2>Recommendations</h2>
<ol>
${result.recommendations.combined.map((item) => `<li>${item.priority} — ${item.text}</li>`).join('\n')}
</ol>
<h2>Performance Metrics</h2>
${performanceSection}
<h2>Microsoft/Bing Verification</h2>
<ul>
${bingSection}
</ul>
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
