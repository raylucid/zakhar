const origin = 'https://raylucid.github.io';
const upstream = 'https://logos-api.com/api/verse';
const passagePattern = /^[가-힣1-3][가-힣0-9\s]*\d{1,3}\s*:\s*\d{1,3}(?:\s*-\s*\d{1,3})?$/u;

export default {
  async fetch(request, env) {
    const headers = {'Access-Control-Allow-Origin': origin, 'Cache-Control': 'no-store'};
    const json = (body, status = 200) => Response.json(body, {status, headers});
    const url = new URL(request.url);
    if (url.pathname !== '/verse') return json({error: 'not_found'}, 404);
    if (request.method !== 'GET') return json({error: 'method_not_allowed'}, 405);
    const reference = url.searchParams.get('ref')?.trim() || '';
    if (reference.length > 120 || !passagePattern.test(reference)) return json({error: 'invalid_reference'}, 400);
    if (!env.LOGOS_API_KEY) return json({error: 'unavailable'}, 503);

    const endpoint = new URL(upstream);
    endpoint.searchParams.set('ref', reference);
    try {
      const response = await fetch(endpoint, {
        headers: {'X-API-KEY': env.LOGOS_API_KEY, Accept: 'application/json'},
        signal: AbortSignal.timeout(8000),
        redirect: 'error'
      });
      if ([400, 404, 429].includes(response.status)) return json({error: 'lookup_failed'}, response.status);
      if (!response.ok) return json({error: 'unavailable'}, 502);
      return json(await response.json());
    } catch {
      return json({error: 'unavailable'}, 502);
    }
  }
};
