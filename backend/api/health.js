const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((value) => value.trim());

export default function handler(req, res) {
  handleCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  sendJson(res, 200, { status: 'ok', timestamp: Date.now() });
}

function handleCors(req, res) {
  const origin = req.headers.origin ?? '*';
  const allowed =
    ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.some((value) => value && origin.includes(value));
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  res.status(statusCode).setHeader('Content-Type', 'application/json').end(JSON.stringify(payload));
}
