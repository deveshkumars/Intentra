/**
 * HTTP response helpers for the gstack progress server.
 *
 * All routes share the same CORS headers, Content-Type, and JSON-serialization
 * pattern. These helpers centralise that boilerplate so call-sites read as
 * intent rather than plumbing.
 *
 * Usage:
 *   return jsonOk({ agents }, corsHeaders);
 *   return jsonCreated(agent, corsHeaders);
 *   return jsonError('name is required', 400, corsHeaders);
 *   return jsonNotFound('intent not found', corsHeaders);
 */

export type CorsHeaders = Record<string, string>;

function json(body: unknown, status: number, corsHeaders: CorsHeaders): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

/** 200 OK with JSON body. */
export function jsonOk(body: unknown, corsHeaders: CorsHeaders): Response {
  return json(body, 200, corsHeaders);
}

/** 201 Created with JSON body. */
export function jsonCreated(body: unknown, corsHeaders: CorsHeaders): Response {
  return json(body, 201, corsHeaders);
}

/** Error response with explicit status code. */
export function jsonError(message: string, status: number, corsHeaders: CorsHeaders): Response {
  return json({ error: message }, status, corsHeaders);
}

/** 400 Bad Request. */
export function jsonBadRequest(message: string, corsHeaders: CorsHeaders): Response {
  return json({ error: message }, 400, corsHeaders);
}

/** 401 Unauthorized. */
export function jsonUnauthorized(corsHeaders: CorsHeaders): Response {
  return json({ error: 'unauthorized' }, 401, corsHeaders);
}

/** 404 Not Found. */
export function jsonNotFound(message: string, corsHeaders: CorsHeaders): Response {
  return json({ error: message }, 404, corsHeaders);
}

/** 500 Internal Server Error. */
export function jsonInternalError(message: string, corsHeaders: CorsHeaders): Response {
  return json({ error: message }, 500, corsHeaders);
}
