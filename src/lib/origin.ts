/**
 * Returns true if the request origin is permitted to access this workflow.
 *
 * Rules:
 * - null origin (file://, sandboxed iframe): allowed in development only.
 * - Empty allowedOrigins list: denied (no origins configured).
 * - Non-empty allowedOrigins: origin must be in the list.
 */
export function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return process.env.NODE_ENV === "development";
  }
  if (allowedOrigins.length === 0) return false;
  const normalised = origin.replace(/\/$/, "");
  return allowedOrigins.includes(normalised);
}
