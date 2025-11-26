import axios from 'axios';
import { performance } from 'node:perf_hooks';
import { URL } from 'node:url';

const USER_AGENT = 'Earned-Owned-AI-Mapper/1.0 (+https://example.com)';
const RESPONSE_TIMEOUT_MS = Number(process.env.PERFORMANCE_TIMEOUT_MS ?? 15000);
const HEAD_TIMEOUT_MS = Number(process.env.PERFORMANCE_HEAD_TIMEOUT_MS ?? 7000);

const gradePoints = {
  optimal: 2,
  acceptable: 1,
  poor: 0,
};

export async function analyzePerformanceBasic(targetUrl) {
  const client = axios.create({
    timeout: RESPONSE_TIMEOUT_MS,
    maxRedirects: 5,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
    responseType: 'text',
    validateStatus: () => true,
  });

  const start = performance.now();
  const response = await client.get(targetUrl);
  const responseTimeMs = Math.round(performance.now() - start);

  if (response.status >= 400 || typeof response.data !== 'string') {
    throw new Error(`Unable to fetch URL (${response.status})`);
  }

  const html = response.data;
  const pageSizeBytes = Buffer.byteLength(html ?? '', 'utf8');
  const redirectCount = response.request?._redirectable?._redirectCount ?? 0;
  const numRequests = 1 + redirectCount;
  const largestImageBytes = await findLargestImageBytes(html, targetUrl);

  const grades = {
    responseTime: gradeResponseTime(responseTimeMs),
    pageSize: gradePageSize(pageSizeBytes),
    numRequests: gradeRequestCount(numRequests),
    largestImage: gradeLargestImage(largestImageBytes),
  };

  const totalPoints = Object.values(grades).reduce((sum, grade) => sum + gradePoints[grade], 0);
  const performanceScore = Math.round((totalPoints / 8) * 100);

  return {
    html,
    statusCode: response.status,
    finalUrl: response.request?.res?.responseUrl ?? targetUrl,
    performance: {
      responseTimeMs,
      pageSizeBytes,
      numRequests,
      largestImageBytes,
      performanceScore,
      grades,
      statusCode: response.status,
    },
  };
}

async function findLargestImageBytes(html, baseUrl) {
  const sources = extractImageSources(html);
  if (!sources.length) return 0;
  let maxBytes = 0;

  const uniqueSources = Array.from(new Set(sources));
  const headRequests = uniqueSources.map((src) => headImage(src, baseUrl));
  const results = await Promise.allSettled(headRequests);

  for (const result of results) {
    if (result.status === 'fulfilled' && Number.isFinite(result.value)) {
      maxBytes = Math.max(maxBytes, result.value);
    }
  }

  return maxBytes;
}

function extractImageSources(html) {
  const regex = /<img\b[^>]*\bsrc=["']?([^"'\s>]+)["']?[^>]*>/gi;
  const sources = [];
  let match;
  while ((match = regex.exec(html))) {
    const src = match[1];
    if (!src || src.toLowerCase().startsWith('data:')) continue;
    sources.push(src.trim());
  }
  return sources;
}

async function headImage(src, baseUrl) {
  try {
    const resolved = new URL(src, baseUrl);
    if (!/^https?:/i.test(resolved.protocol)) return 0;
    const response = await axios.head(resolved.toString(), {
      timeout: HEAD_TIMEOUT_MS,
      maxRedirects: 2,
      validateStatus: () => true,
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    if (response.status >= 400) return 0;
    const contentLength = response.headers?.['content-length'];
    if (!contentLength) return 0;
    const parsed = Number.parseInt(contentLength, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function gradeResponseTime(value) {
  if (value < 200) return 'optimal';
  if (value <= 500) return 'acceptable';
  return 'poor';
}

function gradePageSize(bytes) {
  const kilobytes = bytes / 1024;
  if (kilobytes < 150) return 'optimal';
  if (kilobytes <= 500) return 'acceptable';
  return 'poor';
}

function gradeRequestCount(count) {
  if (count <= 1) return 'optimal';
  if (count <= 3) return 'acceptable';
  return 'poor';
}

function gradeLargestImage(bytes) {
  const kilobytes = bytes / 1024;
  if (kilobytes < 150) return 'optimal';
  if (kilobytes <= 500) return 'acceptable';
  return 'poor';
}
