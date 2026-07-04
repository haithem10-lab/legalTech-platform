import { BLOCKED_DOMAINS } from "./blocked-domains";

export function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export function isPersonalDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.includes(domain.toLowerCase());
}

export function formatOrgName(domain: string): string {
  const name = domain.split(".")[0] ?? domain;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
