import { isOriginAllowed } from "@/lib/origin";

describe("isOriginAllowed", () => {
  describe("empty allowedOrigins", () => {
    it("returns false when allowedOrigins is empty", () => {
      expect(isOriginAllowed("https://smithlaw.com", [])).toBe(false);
    });

    it("returns false for null origin with empty list", () => {
      expect(isOriginAllowed(null, [])).toBe(false);
    });
  });

  describe("null origin handling", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      process.env = { ...OLD_ENV };
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it("allows null origin in development", () => {
      (process.env as Record<string, string>).NODE_ENV = "development";
      expect(isOriginAllowed(null, ["https://smithlaw.com"])).toBe(true);
    });

    it("blocks null origin in production", () => {
      (process.env as Record<string, string>).NODE_ENV = "production";
      expect(isOriginAllowed(null, ["https://smithlaw.com"])).toBe(false);
    });

    it('treats "null" string same as null in production', () => {
      (process.env as Record<string, string>).NODE_ENV = "production";
      expect(isOriginAllowed("null", ["https://smithlaw.com"])).toBe(false);
    });
  });

  describe("exact origin matching", () => {
    const allowedOrigins = [
      "https://smithlaw.com",
      "https://www.smithlaw.com",
    ];

    it("allows exact match", () => {
      expect(isOriginAllowed("https://smithlaw.com", allowedOrigins)).toBe(true);
    });

    it("allows www subdomain if listed", () => {
      expect(isOriginAllowed("https://www.smithlaw.com", allowedOrigins)).toBe(true);
    });

    it("blocks unlisted domain", () => {
      expect(isOriginAllowed("https://evil.com", allowedOrigins)).toBe(false);
    });

    it("blocks subdomain not in list", () => {
      expect(isOriginAllowed("https://app.smithlaw.com", allowedOrigins)).toBe(false);
    });

    it("blocks http when only https is listed", () => {
      expect(isOriginAllowed("http://smithlaw.com", allowedOrigins)).toBe(false);
    });
  });

  describe("trailing slash normalization", () => {
    it("allows origin with trailing slash", () => {
      expect(isOriginAllowed("https://smithlaw.com/", ["https://smithlaw.com"])).toBe(true);
    });

    it("allows listed origin with trailing slash", () => {
      expect(isOriginAllowed("https://smithlaw.com", ["https://smithlaw.com/"])).toBe(true);
    });
  });

  describe("attack vectors", () => {
    it("blocks smithlaw.com.evil.com", () => {
      expect(
        isOriginAllowed("https://smithlaw.com.evil.com", ["https://smithlaw.com"])
      ).toBe(false);
    });

    it("blocks evilsmithlaw.com", () => {
      expect(
        isOriginAllowed("https://evilsmithlaw.com", ["https://smithlaw.com"])
      ).toBe(false);
    });

    it("blocks javascript: protocol", () => {
      expect(
        isOriginAllowed("javascript:alert(1)", ["https://smithlaw.com"])
      ).toBe(false);
    });
  });
});
