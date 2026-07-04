import { sanitizeText, sanitizeWebhookUrl } from "@/lib/sanitize";

describe("sanitizeText", () => {
  describe("HTML removal", () => {
    it("strips script tags", () => {
      expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe("Hello");
    });

    it("strips img tags", () => {
      expect(sanitizeText("<img src=x onerror=alert(1)>text")).toBe("text");
    });

    it("strips all HTML tags", () => {
      expect(sanitizeText("<b>bold</b> and <i>italic</i>")).toBe("bold and italic");
    });

    it("strips nested tags", () => {
      expect(sanitizeText("<div><p>nested</p></div>")).toBe("nested");
    });
  });

  describe("HTML entities", () => {
    it("strips HTML entities", () => {
      const result = sanitizeText("&lt;script&gt;");
      expect(result).not.toContain("&lt;");
    });
  });

  describe("special characters", () => {
    it("removes null bytes", () => {
      expect(sanitizeText("hello\0world")).toBe("hello world");
    });

    it("removes unicode direction overrides", () => {
      expect(sanitizeText("hello‮world")).not.toContain("‮");
    });
  });

  describe("normal content", () => {
    it("preserves normal text", () => {
      expect(sanitizeText("Smith & Associates")).toBe("Smith & Associates");
    });

    it("preserves numbers", () => {
      expect(sanitizeText("55%")).toBe("55%");
    });

    it("trims whitespace", () => {
      expect(sanitizeText("  hello  ")).toBe("hello");
    });

    it("normalizes multiple spaces", () => {
      expect(sanitizeText("hello   world")).toBe("hello world");
    });

    it("enforces max length", () => {
      const long = "a".repeat(15_000);
      expect(sanitizeText(long).length).toBeLessThanOrEqual(10_000);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(sanitizeText("")).toBe("");
    });

    it("handles non-string input", () => {
      expect(sanitizeText(null as unknown as string)).toBe("");
      expect(sanitizeText(undefined as unknown as string)).toBe("");
      expect(sanitizeText(123 as unknown as string)).toBe("");
    });
  });
});

describe("sanitizeWebhookUrl", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("valid URLs", () => {
    it("allows https URLs", () => {
      expect(sanitizeWebhookUrl("https://api.smithlaw.com/webhook")).not.toBeNull();
    });

    it("allows http in development", () => {
      process.env.NODE_ENV = "development";
      expect(sanitizeWebhookUrl("http://localhost:4000")).not.toBeNull();
    });
  });

  describe("SSRF prevention", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("blocks localhost", () => {
      expect(sanitizeWebhookUrl("https://localhost/webhook")).toBeNull();
    });

    it("blocks 127.0.0.1", () => {
      expect(sanitizeWebhookUrl("https://127.0.0.1/webhook")).toBeNull();
    });

    it("blocks 192.168.x.x", () => {
      expect(sanitizeWebhookUrl("https://192.168.1.1/webhook")).toBeNull();
    });

    it("blocks 10.x.x.x", () => {
      expect(sanitizeWebhookUrl("https://10.0.0.1/webhook")).toBeNull();
    });

    it("blocks GCP metadata endpoint", () => {
      expect(sanitizeWebhookUrl("http://metadata.google.internal")).toBeNull();
    });

    it("blocks javascript: protocol", () => {
      expect(sanitizeWebhookUrl("javascript:alert(1)")).toBeNull();
    });

    it("blocks file: protocol", () => {
      expect(sanitizeWebhookUrl("file:///etc/passwd")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(sanitizeWebhookUrl("")).toBe("");
    });

    it("returns null for invalid URL", () => {
      expect(sanitizeWebhookUrl("not-a-url")).toBeNull();
    });
  });
});
