import { rateLimit } from "@/lib/ratelimit";

describe("rateLimit", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const result = rateLimit("test-key-1", 5, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test-key-2", 5, 60_000);
    }
    const result = rateLimit("test-key-2", 5, 60_000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test-key-3", 5, 60_000);
    }
    jest.advanceTimersByTime(61_000);
    const result = rateLimit("test-key-3", 5, 60_000);
    expect(result.success).toBe(true);
  });

  it("tracks different identifiers separately", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("key-a", 5, 60_000);
    }
    const result = rateLimit("key-b", 5, 60_000);
    expect(result.success).toBe(true);
  });

  it("returns correct remaining count", () => {
    rateLimit("test-key-4", 10, 60_000);
    rateLimit("test-key-4", 10, 60_000);
    rateLimit("test-key-4", 10, 60_000);
    const result = rateLimit("test-key-4", 10, 60_000);
    expect(result.remaining).toBe(6);
  });
});
