// Shared fixtures for integration tests

export const mockSession = {
  user: {
    id: "user_123",
    email: "sarah@smithlaw.com",
    name: "Sarah Chen",
    orgId: "org_abc",
    orgName: "Smith & Associates",
    role: "admin" as const,
    status: "active" as const,
  },
};

export const mockWorkflow = {
  id: "wf_123",
  orgId: "org_abc",
  name: "Company Formation",
  status: "published" as const,
  schema: [
    { id: "f1", type: "text" as const,     label: "Company Name",   required: true },
    { id: "f2", type: "email" as const,    label: "Contact Email",  required: true },
    { id: "f3", type: "dropdown" as const, label: "Entity Type",    required: true, options: ["LLC", "C-Corp", "S-Corp"] },
  ],
  theme: {
    bgColor: "#1C2127",
    font: "Inter",
    radius: 8,
    density: "compact" as const,
    buttonColor: "#1F6F54",
    buttonTextColor: "#FFFFFF",
  },
  webhookUrl: "https://example.com/webhook",
  hmacSecret: "test-secret-32-bytes-xxxxxxxxxxxxxxx",
  allowedOrigins: ["https://smithlaw.com"],
  createdBy: "user_123",
  createdAt: "2026-06-25T00:00:00Z",
  updatedAt: "2026-06-25T00:00:00Z",
};
