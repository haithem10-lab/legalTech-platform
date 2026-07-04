import { POST } from "@/app/api/public/submit/[workflowId]/route";
import { mockWorkflow } from "./setup";

jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("@/lib/db", () => ({
  getWorkflow: jest.fn(),
  writeSubmission: jest.fn().mockResolvedValue("sub_123"),
  updateSubmission: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/ratelimit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 99, resetAt: 0 }),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
  rateLimitResponse: jest.fn(),
}));

import { getWorkflow, writeSubmission } from "@/lib/db";
const mockedGetWorkflow   = getWorkflow   as jest.Mock;
const mockedWriteSubmission = writeSubmission as jest.Mock;

global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

function makeRequest(data: Record<string, unknown>, origin = "https://smithlaw.com") {
  return new Request("http://localhost:3000/api/public/submit/wf_123", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ data }),
  });
}

const validData = { f1: "Apex Fintech Holdings", f2: "marcus@apexfintech.com", f3: "LLC" };

describe("POST /api/public/submit/[workflowId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetWorkflow.mockResolvedValue(mockWorkflow);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
  });

  it("returns 403 for unlisted origin", async () => {
    const res = await POST(makeRequest(validData, "https://evil.com"), {
      params: { workflowId: "wf_123" },
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeRequest({ f1: "", f2: "sarah@test.com", f3: "LLC" }), {
      params: { workflowId: "wf_123" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ f1: "Test Company", f2: "not-an-email", f3: "LLC" }), {
      params: { workflowId: "wf_123" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid dropdown value", async () => {
    const res = await POST(makeRequest({ f1: "Test Company", f2: "sarah@test.com", f3: "InvalidOption" }), {
      params: { workflowId: "wf_123" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 for valid submission", async () => {
    const res = await POST(makeRequest(validData), { params: { workflowId: "wf_123" } });
    expect(res.status).toBe(200);
  });

  it("writes submission to Firestore", async () => {
    await POST(makeRequest(validData), { params: { workflowId: "wf_123" } });
    expect(mockedWriteSubmission).toHaveBeenCalledTimes(1);
  });

  it("fires webhook after successful submission", async () => {
    await POST(makeRequest(validData), { params: { workflowId: "wf_123" } });
    expect(global.fetch).toHaveBeenCalledWith(
      mockWorkflow.webhookUrl,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Signature": expect.any(String),
          "X-Workflow-Id": "wf_123",
        }),
      })
    );
  });

  it("strips HTML from text inputs", async () => {
    await POST(
      makeRequest({ f1: '<script>alert("xss")</script>Apex', f2: "marcus@apexfintech.com", f3: "LLC" }),
      { params: { workflowId: "wf_123" } }
    );
    const saved = mockedWriteSubmission.mock.calls[0][1] as { data: Record<string, string> };
    expect(saved.data.f1).not.toContain("<script>");
    expect(saved.data.f1).toContain("Apex");
  });

  it("returns 200 even if webhook fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Webhook endpoint down"));
    const res = await POST(makeRequest(validData), { params: { workflowId: "wf_123" } });
    expect(res.status).toBe(200);
    expect(mockedWriteSubmission).toHaveBeenCalled();
  });

  it("includes valid HMAC signature on webhook call", async () => {
    await POST(makeRequest(validData), { params: { workflowId: "wf_123" } });
    const [, callOptions] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit & { headers: Record<string, string>; body: string }];
    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", mockWorkflow.hmacSecret)
      .update(callOptions.body)
      .digest("hex");
    expect(callOptions.headers["X-Signature"]).toBe(expected);
  });
});
