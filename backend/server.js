import http from 'node:http';
import { URL } from 'node:url';

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((value) => value.trim());

const server = http.createServer(async (req, res) => {
  handleCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
  }

  if (req.method === 'POST' && req.url === '/api/analyze') {
    try {
      const body = await readJsonBody(req);
      if (!body?.url) {
        return sendJson(res, 400, { error: 'Missing URL in request body.' });
      }
      const html = await fetchHtml(body.url);
      return sendJson(res, 200, { html });
    } catch (error) {
      console.error('Analyze error', error);
      return sendJson(res, 500, { error: error.message ?? 'Unable to analyze URL.' });
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`AI Mapper backend listening on http://localhost:${PORT}`);
});

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
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}
