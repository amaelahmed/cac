function normalizePlace(item) {
  const address = item.address || {};
  const city = address.city || address.town || address.village || address.municipality || address.county || '';

  return {
    displayName: item.display_name,
    city,
    state: address.state || address.region || '',
    country: address.country || '',
    countryCode: address.country_code || '',
    lat: item.lat,
    lon: item.lon,
    type: item.type,
    importance: item.importance || 0
  };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (q.length < 2) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const searchUrl = new URL('https://nominatim.openstreetmap.org/search');
    searchUrl.searchParams.set('format', 'jsonv2');
    searchUrl.searchParams.set('addressdetails', '1');
    searchUrl.searchParams.set('limit', '5');
    searchUrl.searchParams.set('q', q);

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'User-Agent': 'CACStrategyBot/1.0 (+https://cancelagencyculture.in)'
      }
    });

    if (!response.ok) {
      throw new Error(`Location lookup failed: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = Array.isArray(data) ? data.map(normalizePlace) : [];

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch {
    return new Response(JSON.stringify({ suggestions: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
