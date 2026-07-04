import { GET } from "@/app/api/public/config/[workflowId]/route";
import { mockWorkflow } from "./setup";

jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("@/lib/db", () => ({ getWorkflow: jest.fn() }));
jest.mock("@/lib/ratelimit", () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 99, resetAt: 0 }),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
  rateLimitResponse: jest.fn(),
}));

import { getWorkflow } from "@/lib/db";
const mockedGetWorkflow = getWorkflow as jest.Mock;

function makeRequest(workflowId: string, origin: string | null) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/public/config/${workflowId}`, { headers });
}

describe("GET /api/public/config/[workflowId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 for non-existent workflow", async () => {
    mockedGetWorkflow.mockResolvedValue(null);
    const res = await GET(makeRequest("wf_notfound", "https://smithlaw.com"), {
      params: { workflowId: "wf_notfound" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for draft workflow", async () => {
    mockedGetWorkflow.mockResolvedValue({ ...mockWorkflow, status: "draft" });
    const res = await GET(makeRequest("wf_123", "https://smithlaw.com"), {
      params: { workflowId: "wf_123" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 for unlisted origin", async () => {
    mockedGetWorkflow.mockResolvedValue(mockWorkflow);
    const res = await GET(makeRequest("wf_123", "https://evil.com"), {
      params: { workflowId: "wf_123" },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for empty allowedOrigins", async () => {
    mockedGetWorkflow.mockResolvedValue({ ...mockWorkflow, allowedOrigins: [] });
    const res = await GET(makeRequest("wf_123", "https://smithlaw.com"), {
      params: { workflowId: "wf_123" },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 for valid origin", async () => {
    mockedGetWorkflow.mockResolvedValue(mockWorkflow);
    const res = await GET(makeRequest("wf_123", "https://smithlaw.com"), {
      params: { workflowId: "wf_123" },
    });
    expect(res.status).toBe(200);
  });

  it("never returns hmacSecret", async () => {
    mockedGetWorkflow.mockResolvedValue(mockWorkflow);
    const res = await GET(makeRequest("wf_123", "https://smithlaw.com"), {
      params: { workflowId: "wf_123" },
    });
    const body = await res.json();
    expect(body).not.toHaveProperty("hmacSecret");
    expect(JSON.stringify(body)).not.toContain("test-secret-32-bytes");
  });

  it("never returns orgId", async () => {
    mockedGetWorkflow.mockResolvedValue(mockWorkflow);
    const res = await GET(makeRequest("wf_123", "https://smithlaw.com"), {
      params: { workflowId: "wf_123" },
    });
    const body = await res.json();
    expect(body).not.toHaveProperty("orgId");
  });

  it("has cache-control: no-store header", async () => {
    mockedGetWorkflow.mockResolvedValue(mockWorkflow);
    const res = await GET(makeRequest("wf_123", "https://smithlaw.com"), {
      params: { workflowId: "wf_123" },
    });
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("has CORS headers for valid origin", async () => {
    mockedGetWorkflow.mockResolvedValue(mockWorkflow);
    const res = await GET(makeRequest("wf_123", "https://smithlaw.com"), {
      params: { workflowId: "wf_123" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});
