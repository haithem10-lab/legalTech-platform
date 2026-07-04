import { signPayload } from "@/lib/hmac";

describe("signPayload", () => {
  const secret = "test-secret-32-bytes-long-enough";
  const payload = JSON.stringify({ workflowId: "wf_123", data: { name: "Test" } });

  it("produces a 64-character hex string", () => {
    const sig = signPayload(payload, secret);
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces consistent signatures", () => {
    expect(signPayload(payload, secret)).toBe(signPayload(payload, secret));
  });

  it("produces different signatures for different payloads", () => {
    expect(signPayload(payload, secret)).not.toBe(
      signPayload(JSON.stringify({ different: "data" }), secret)
    );
  });

  it("produces different signatures for different secrets", () => {
    expect(signPayload(payload, secret)).not.toBe(
      signPayload(payload, "different-secret")
    );
  });

  it("is sensitive to payload changes", () => {
    const original = signPayload(payload, secret);
    const tampered = signPayload(payload.replace("Test", "Tampered"), secret);
    expect(original).not.toBe(tampered);
  });

  it("receiver can verify sender signature", () => {
    const senderSig = signPayload(payload, secret);
    const receiverSig = signPayload(payload, secret);
    expect(senderSig).toBe(receiverSig);
  });

  it("detects tampered payload", () => {
    const originalSig = signPayload(payload, secret);
    const tamperedPayload = payload.replace('"name":"Test"', '"name":"Hacked"');
    const tamperedSig = signPayload(tamperedPayload, secret);
    expect(originalSig).not.toBe(tamperedSig);
  });
});
