const cacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
  "Expires": "0",
} as const;

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cache-Control, Pragma",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function publicHeaders(origin: string | null): Record<string, string> {
  return { ...cacheHeaders, ...corsHeaders(origin) };
}

export function jsonError(
  message: string,
  status: number,
  headers?: Record<string, string>
): Response {
  return Response.json({ error: message }, { status, headers });
}

export function handleOptions(request: Request): Response {
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
