import { URL } from 'node:url';

const usageTracker = new Map();
const FREE_ANALYSIS_LIMIT = Number(process.env.FREE_ANALYSIS_LIMIT ?? 1);
const SUBSCRIPTION_TOKEN = process.env.SUBSCRIPTION_TOKEN ?? '';
const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

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
      if (!body?.url) {
        return sendJson(res, 400, { error: 'Missing URL in request body.' });
      }
      const clientId = getClientId(req);
      const subscribed = isSubscribed(req, body);
      if (!subscribed && isQuotaExceeded(clientId)) {
        return sendJson(res, 402, {
          error: 'subscription_required',
          message: 'Free analysis limit reached. Subscribe to continue.',
        });
      }
      const [html, pageSpeed] = await Promise.all([fetchHtml(body.url), fetchPageSpeed(body.url)]);
      if (!subscribed) {
        recordUsage(clientId);
      }
      return sendJson(res, 200, { html, pageSpeed });
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
        if (raw.length > 5_000) {
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

async function fetchHtml(targetUrl) {
  const normalized = normalizeUrl(targetUrl);
  const response = await fetch(normalized, {
    headers: {
      'User-Agent': 'Earned-Owned-AI-Mapper/1.0 (+https://example.com)',
    },
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch URL (${response.status})`);
  }
  return await response.text();
}

async function fetchPageSpeed(targetUrl) {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) return null;
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', targetUrl);
  endpoint.searchParams.set('key', apiKey);
  endpoint.searchParams.set('strategy', 'mobile');

  try {
    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      console.warn('PageSpeed Insights error', await response.text());
      return null;
    }
    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    return {
      performanceScore: lighthouse?.categories?.performance?.score ?? null,
      firstContentfulPaint: lighthouse?.audits?.['first-contentful-paint']?.numericValue ?? null,
      largestContentfulPaint: lighthouse?.audits?.['largest-contentful-paint']?.numericValue ?? null,
      totalBlockingTime: lighthouse?.audits?.['total-blocking-time']?.numericValue ?? null,
      cumulativeLayoutShift: lighthouse?.audits?.['cumulative-layout-shift']?.numericValue ?? null,
    };
  } catch (error) {
    console.warn('Failed to fetch PageSpeed data', error);
    return null;
  }
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
