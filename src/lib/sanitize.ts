const DIRECTION_OVERRIDES = /[​-‏‪-‮⁦-⁩﻿]/g;
const MAX_LENGTH = 10_000;

export function sanitizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  let s = value;
  // Strip script/style blocks entirely (tag + content)
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Strip remaining HTML tags
  s = s.replace(/<[^>]*>/g, "");
  // Decode common HTML entities, then strip any resulting tags
  s = s
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
  s = s.replace(/<[^>]*>/g, "");
  // Remove null bytes
  s = s.replace(/\0/g, " ");
  // Remove Unicode direction-override characters
  s = s.replace(DIRECTION_OVERRIDES, "");
  // Trim and normalise runs of whitespace
  s = s.trim().replace(/\s+/g, " ");
  return s.slice(0, MAX_LENGTH);
}

const PRIVATE_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^::1$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^metadata\.google\.internal$/i,
];

export function sanitizeWebhookUrl(url: string): string | null {
  if (!url.trim()) return "";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const isDev = process.env.NODE_ENV === "development";
  if (!isDev) {
    const h = parsed.hostname;
    if (PRIVATE_HOSTS.some((re) => re.test(h))) return null;
  }

  return url;
}
