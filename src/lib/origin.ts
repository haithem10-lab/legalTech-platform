/**
 * Returns true if the request origin is permitted to access this workflow.
 *
 * Rules:
 * - null origin (file://, sandboxed iframe): allowed in development only.
 * - Non-null origin + empty allowedOrigins list: allowed (open access).
 * - Non-null origin + non-empty allowedOrigins: must be in the list.
 */
export function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return process.env.NODE_ENV === "development";
  }
  if (allowedOrigins.length === 0) return true;
  const normalised = origin.replace(/\/$/, "");
  return allowedOrigins.includes(normalised);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}
