import { getRequestSession } from "./utils/auth";
import { normalizeUrlInput } from "../../shared/normalizeUrlInput.js";
import * as cheerio from 'cheerio';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const session = await getRequestSession(env, request);
    
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const body = await request.json();
    const normalized = normalizeUrlInput(body.url);
    if (!normalized.ok) {
      return new Response(JSON.stringify({ error: normalized.error }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(normalized.url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return new Response(JSON.stringify({ error: 'Only HTTP/HTTPS protocols are allowed' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const blockedHosts = ['localhost', '127.0.0.1', '169.254.169.254', '::1'];
    if (blockedHosts.includes(parsedUrl.hostname) || parsedUrl.hostname.endsWith('.internal')) {
      return new Response(JSON.stringify({ error: 'Access to internal resources is forbidden' }), { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const isPrivateIP = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(parsedUrl.hostname) || parsedUrl.hostname === '::1';
    if (isPrivateIP) {
      return new Response(JSON.stringify({ error: 'Access to private network IP addresses is forbidden' }), { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    let fetchRes;
    try {
      fetchRes = await fetch(normalized.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
        signal: controller.signal,
        redirect: 'manual' 
      });
      clearTimeout(timeoutId);
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }

    if (fetchRes.status >= 300 && fetchRes.status < 400) {
      return new Response(JSON.stringify({ error: 'Redirects are not allowed for security reasons.' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    if (!fetchRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch: ${fetchRes.status}` }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const contentType = fetchRes.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return new Response(JSON.stringify({ error: 'Only HTML or text content is allowed.' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const html = await fetchRes.text();
    if (html.length > 2000000) {
      return new Response(JSON.stringify({ error: 'Response too large. Max size is 2MB.' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, iframe, noscript, svg').remove();
    
    let text = $('body').text().replace(/\s+/g, ' ').trim();
    if (text.length > 3000) text = text.substring(0, 3000) + '... (truncated)';

    return new Response(JSON.stringify({ text }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err) {
    console.error('Scraping error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
