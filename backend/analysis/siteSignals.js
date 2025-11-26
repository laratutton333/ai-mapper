import axios from 'axios';
import { URL } from 'node:url';
import { promises as dns } from 'node:dns';

const SIGNAL_TIMEOUT_MS = Number(process.env.SIGNAL_TIMEOUT_MS ?? 7000);

export async function collectSiteSignals(targetUrl) {
  const defaults = {
    origin: null,
    hostname: null,
    robotsTxt: null,
    bingbotAllowed: null,
    bingbotDisallow: [],
    robotsAllowsAll: null,
    sitemapUrl: null,
    sitemapXml: null,
    sitemapLastmodRecent: null,
    indexNowEndpointOk: false,
    indexNowContent: null,
    llmsTxtPresent: false,
    dnsMsvalidate: null,
    llmsTxtContent: null,
  };

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return defaults;
  }

  defaults.origin = `${parsed.protocol}//${parsed.host}`;
  defaults.hostname = parsed.hostname;

  const [robots, llms, indexNow] = await Promise.all([
    safeGet(`${defaults.origin}/robots.txt`),
    safeGet(`${defaults.origin}/llms.txt`),
    safeGet(`${defaults.origin}/indexnow.txt`),
  ]);

  if (robots?.data) {
    defaults.robotsTxt = robots.data;
    const robotsInsight = evaluateRobots(robots.data);
    defaults.bingbotAllowed = robotsInsight.bingbotAllowed;
    defaults.bingbotDisallow = robotsInsight.disallow;
    defaults.robotsAllowsAll = robotsInsight.allowsAll;
    defaults.sitemapUrl = robotsInsight.sitemapUrl ?? `${defaults.origin}/sitemap.xml`;
  } else {
    defaults.sitemapUrl = `${defaults.origin}/sitemap.xml`;
  }

  if (llms?.data && llms.status < 400) {
    defaults.llmsTxtPresent = true;
    defaults.llmsTxtContent = llms.data;
  }

  if (indexNow?.data && indexNow.status < 400) {
    defaults.indexNowEndpointOk = true;
    defaults.indexNowContent = indexNow.data;
  }

  if (defaults.sitemapUrl) {
    const sitemap = await safeGet(defaults.sitemapUrl);
    if (sitemap?.data) {
      defaults.sitemapXml = sitemap.data;
      const lastmod = extractLastmod(sitemap.data);
      if (lastmod) {
        const diff = Date.now() - lastmod.getTime();
        defaults.sitemapLastmodRecent = diff <= 1000 * 60 * 60 * 24 * 60; // 60 days
      } else {
        defaults.sitemapLastmodRecent = null;
      }
    }
  }

  try {
    const txtRecords = await dns.resolveTxt(parsed.hostname);
    const flattened = txtRecords.flat();
    const msvalidateRecord = flattened.find((entry) => entry.toLowerCase().includes('msvalidate.01='));
    if (msvalidateRecord) {
      defaults.dnsMsvalidate = msvalidateRecord.split('=').pop();
    }
  } catch {
    // ignore DNS errors
  }

  return defaults;
}

async function safeGet(url) {
  try {
    const response = await axios.get(url, {
      timeout: SIGNAL_TIMEOUT_MS,
      maxRedirects: 3,
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 500) {
      return { status: response.status, data: response.data };
    }
    return null;
  } catch {
    return null;
  }
}

function evaluateRobots(content = '') {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  let currentAgent = null;
  let allowsAll = true;
  let bingbotAllowed = true;
  const disallow = [];
  let sitemapUrl = null;

  lines.forEach((line) => {
    if (!line) return;
    if (line.toLowerCase().startsWith('user-agent')) {
      currentAgent = line.split(':')[1]?.trim().toLowerCase();
      return;
    }
    if (line.toLowerCase().startsWith('sitemap')) {
      const value = line.split(':')[1]?.trim();
      if (value) sitemapUrl = value;
    }
    if (line.toLowerCase().startsWith('disallow')) {
      const path = line.split(':')[1]?.trim() ?? '';
      if (!path) return;
      if (currentAgent === '*' && path === '/') {
        allowsAll = false;
      }
      if (currentAgent && (currentAgent.includes('bingbot') || currentAgent.includes('msnbot') || currentAgent === '*')) {
        disallow.push(path);
        if (path === '/') {
          bingbotAllowed = false;
        }
      }
    }
  });

  return {
    allowsAll,
    bingbotAllowed,
    disallow,
    sitemapUrl,
  };
}

function extractLastmod(xml = '') {
  const match = xml.match(/<lastmod>([^<]+)<\/lastmod>/i);
  if (!match) return null;
  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? null : date;
}
