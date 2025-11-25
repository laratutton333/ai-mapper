import { URL } from 'node:url';
import { analyzePerformanceBasic } from '../analysis/performance.js';
import { extractMetrics } from '../analysis/extractMetrics.js';
import { computeSeoScore, computeGeoScore } from '../analysis/scoring.js';

const usageTracker = new Map();
const FREE_ANALYSIS_LIMIT = Number(process.env.FREE_ANALYSIS_LIMIT ?? 1);
const SUBSCRIPTION_TOKEN = process.env.SUBSCRIPTION_TOKEN ?? '';
const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_SIZE = 2_000_000; // ~2MB

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((value) => value.trim());

export default async function handler(req, res) {
  handleCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (req.method === 'GET' && pathname.endsWith('/health')) {
    return sendJson(res, 200, { status: 'ok', timestamp: Date.now() });
  }

  if (req.method === 'POST' && pathname.endsWith('/api/analyze')) {
    try {
      const body = await readJsonBody(req);
      if (!body?.url && !body?.html && !body?.text) {
        return sendJson(res, 400, { error: 'Provide a URL, HTML, or text to analyze.' });
      }
      const clientId = getClientId(req);
      const subscribed = isSubscribed(req, body);
      if (!subscribed && isQuotaExceeded(clientId)) {
        return sendJson(res, 402, {
          error: 'subscription_required',
          message: 'Free analysis limit reached. Subscribe to continue.',
        });
      }
      let html = '';
      let performance = null;
      let normalizedUrl = '';
      if (body.url) {
        normalizedUrl = normalizeUrl(body.url);
        const performanceResult = await analyzePerformanceBasic(normalizedUrl);
        html = performanceResult.html;
        performance = performanceResult.performance;
      } else if (body.html) {
        html = body.html;
      } else if (body.text) {
        html = wrapTextAsHtml(body.text);
      }
      if (!html) {
        throw new Error('No HTML content returned for analysis.');
      }
      const metrics = extractMetrics(html, normalizedUrl);
      const seoResult = computeSeoScore(metrics, html);
      const geoResult = computeGeoScore(metrics, html);
      if (!subscribed) {
        recordUsage(clientId);
      }
      return sendJson(res, 200, {
        html,
        performance,
        metrics,
        seoScore: seoResult.total,
        geoScore: geoResult.total,
        seoBreakdown: seoResult.breakdown,
        geoBreakdown: geoResult.breakdown,
      });
    } catch (error) {
      console.error('Analyze error', error);
      return sendJson(res, 500, { error: error.message ?? 'Unable to analyze URL.' });
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
}

function handleCors(req, res) {
  const origin = req.headers.origin ?? '*';
  const allowed =
    ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.some((value) => value && origin.includes(value));
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req
      .on('data', (chunk) => {
        raw += chunk;
        if (raw.length > MAX_BODY_SIZE) {
          req.destroy();
          reject(new Error('Payload too large.'));
        }
      })
      .on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (error) {
          reject(new Error('Invalid JSON body.'));
        }
      })
      .on('error', reject);
  });
}

function normalizeUrl(value) {
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }
  try {
    // Validate URL
    new URL(value);
    return value;
  } catch {
    throw new Error('Invalid URL provided.');
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function getClientId(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

function isSubscribed(req, body) {
  if (!SUBSCRIPTION_TOKEN) return false;
  const headerToken = req.headers['x-subscription-token'];
  if (headerToken && headerToken === SUBSCRIPTION_TOKEN) return true;
  if (body?.subscriptionToken && body.subscriptionToken === SUBSCRIPTION_TOKEN) return true;
  return false;
}

function isQuotaExceeded(clientId) {
  if (FREE_ANALYSIS_LIMIT <= 0) return false;
  const entry = usageTracker.get(clientId);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > USAGE_WINDOW_MS) {
    usageTracker.delete(clientId);
    return false;
  }
  return entry.count >= FREE_ANALYSIS_LIMIT;
}

function recordUsage(clientId) {
  if (!clientId) return;
  const now = Date.now();
  const entry = usageTracker.get(clientId);
  if (!entry || now - entry.timestamp > USAGE_WINDOW_MS) {
    usageTracker.set(clientId, { count: 1, timestamp: now });
  } else {
    entry.count += 1;
    entry.timestamp = now;
  }
}

function wrapTextAsHtml(text = '') {
  const normalized = String(text ?? '').trim();
  if (!normalized) return '';
  const blocks = normalized.split(/\n{2,}/).map((block) => `<p>${block.replace(/\n/g, ' ').trim()}</p>`);
  return `<article>${blocks.join('')}</article>`;
}
