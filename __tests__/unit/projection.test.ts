import { publicProjection } from "@/lib/projection";
import type { Workflow } from "@/types/workflow";

const mockWorkflow: Workflow = {
  id: "wf_123",
  orgId: "org_456",
  name: "Test Workflow",
  status: "published",
  schema: [],
  theme: {
    bgColor: "#FBF8F2",
    font: "Inter",
    radius: 6,
    density: "spacious",
    buttonColor: "#1F6F54",
    buttonTextColor: "#FFFFFF",
  },
  webhookUrl: "https://example.com/hook",
  hmacSecret: "super-secret-value-never-expose",
  allowedOrigins: ["https://smithlaw.com"],
  createdBy: "user_789",
  createdAt: "2026-06-25T00:00:00Z",
  updatedAt: "2026-06-25T00:00:00Z",
};

describe("publicProjection", () => {
  it("strips hmacSecret from workflow", () => {
    const result = publicProjection(mockWorkflow);
    expect(result).not.toHaveProperty("hmacSecret");
  });

  it("strips orgId from result", () => {
    const result = publicProjection(mockWorkflow);
    expect(result).not.toHaveProperty("orgId");
  });

  it("strips createdBy from result", () => {
    const result = publicProjection(mockWorkflow);
    expect(result).not.toHaveProperty("createdBy");
  });

  it("preserves all public fields", () => {
    const result = publicProjection(mockWorkflow);
    expect(result.name).toBe("Test Workflow");
    expect(result.schema).toEqual([]);
    expect(result.theme).toEqual(mockWorkflow.theme);
    expect(result.allowedOrigins).toEqual(["https://smithlaw.com"]);
  });

  it("does not mutate the original object", () => {
    publicProjection(mockWorkflow);
    expect(mockWorkflow.hmacSecret).toBe("super-secret-value-never-expose");
  });

  it("runtime confirms secret is absent from result", () => {
    const result = publicProjection(mockWorkflow);
    expect("hmacSecret" in result).toBe(false);
  });
});
