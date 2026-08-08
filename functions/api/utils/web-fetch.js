import * as cheerio from 'cheerio';
import { normalizeUrlInput } from "../../../shared/normalizeUrlInput.js";

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '169.254.169.254', '::1']);

export function validatePublicHttpUrl(rawUrl) {
  const normalized = normalizeUrlInput(rawUrl);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  let parsedUrl;
  try {
    parsedUrl = new URL(normalized.url);
  } catch {
    return { ok: false, error: 'Invalid URL format.' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { ok: false, error: 'Only HTTP/HTTPS URLs are allowed.' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isPrivateIP = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.internal') || isPrivateIP) {
    return { ok: false, error: 'Access to internal resources is forbidden.' };
  }

  return { ok: true, url: normalized.url };
}

function uniqueClean(values, limit) {
  const seen = new Set();
  const cleaned = [];
  for (const value of values) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 2) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(text.slice(0, 160));
    if (cleaned.length >= limit) break;
  }
  return cleaned;
}

function detectGaps(snapshot) {
  const text = `${snapshot.title} ${snapshot.description} ${snapshot.text}`.toLowerCase();
  const gaps = [];

  if (snapshot.callsToAction.length === 0) gaps.push('No clear call-to-action found.');
  if (!/price|pricing|plan|menu|book|call|whatsapp|contact/.test(text)) gaps.push('Offer or next step is not obvious.');
  if (!/review|testimonial|client|customer|case study|rating/.test(text)) gaps.push('Trust proof is weak or missing.');
  if (!/kozhikode|calicut|kerala|near me|local|address|location/.test(text)) gaps.push('Local relevance is not visible enough.');
  if (!snapshot.description) gaps.push('Meta description is missing.');

  return gaps;
}

export async function fetchWebSnapshot(rawUrl, options = {}) {
  const validation = validatePublicHttpUrl(rawUrl);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 7000);

  let fetchRes;
  try {
    fetchRes = await fetch(validation.url, {
      headers: {
        'User-Agent': 'CACStrategyBot/1.0 (+https://cancelagencyculture.in)'
      },
      signal: controller.signal,
      redirect: 'manual'
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (fetchRes.status >= 300 && fetchRes.status < 400) {
    throw new Error('Redirects are not allowed for security reasons.');
  }

  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch website: ${fetchRes.status}`);
  }

  const contentType = fetchRes.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new Error('Only HTML or text pages can be scanned.');
  }

  const html = await fetchRes.text();
  if (html.length > 2000000) {
    throw new Error('Response too large. Max size is 2MB.');
  }

  const $ = cheerio.load(html);
  const title = $('title').first().text().replace(/\s+/g, ' ').trim();
  const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
  const headings = uniqueClean($('h1, h2, h3').map((_, element) => $(element).text()).get(), 12);
  const callsToAction = uniqueClean($('a, button').map((_, element) => $(element).text()).get(), 12)
    .filter(text => /book|buy|call|contact|get|start|try|demo|order|reserve|whatsapp|enquire|join|subscribe|download/i.test(text));

  $('script, style, nav, footer, header, iframe, noscript, svg').remove();
  let text = $('body').text().replace(/\s+/g, ' ').trim();
  if (text.length > (options.maxTextLength || 5000)) {
    text = `${text.slice(0, options.maxTextLength || 5000)}...`;
  }

  const snapshot = {
    url: validation.url,
    title,
    description: description.replace(/\s+/g, ' ').trim().slice(0, 300),
    headings,
    callsToAction,
    text,
    wordCount: text ? text.split(/\s+/).length : 0
  };

  return {
    ...snapshot,
    detectedGaps: detectGaps(snapshot)
  };
}
