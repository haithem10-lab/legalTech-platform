import { extractDomain, isPersonalDomain, formatOrgName } from "@/lib/domain";

describe("extractDomain", () => {
  it("extracts domain from email", () => {
    expect(extractDomain("sarah@smithlaw.com")).toBe("smithlaw.com");
  });

  it("handles subdomains", () => {
    expect(extractDomain("sarah@mail.smithlaw.com")).toBe("mail.smithlaw.com");
  });

  it("lowercases the domain", () => {
    expect(extractDomain("sarah@SmithLaw.COM")).toBe("smithlaw.com");
  });
});

describe("isPersonalDomain", () => {
  it("identifies Gmail as personal", () => {
    expect(isPersonalDomain("gmail.com")).toBe(true);
  });

  it("identifies Yahoo as personal", () => {
    expect(isPersonalDomain("yahoo.com")).toBe(true);
  });

  it("identifies Hotmail as personal", () => {
    expect(isPersonalDomain("hotmail.com")).toBe(true);
  });

  it("identifies Outlook as personal", () => {
    expect(isPersonalDomain("outlook.com")).toBe(true);
  });

  it("identifies work domain as not personal", () => {
    expect(isPersonalDomain("smithlaw.com")).toBe(false);
  });

  it("identifies custom domain as not personal", () => {
    expect(isPersonalDomain("meridianlegal.com")).toBe(false);
  });
});

describe("formatOrgName", () => {
  it("capitalizes first letter", () => {
    expect(formatOrgName("smithlaw.com")).toContain("Smithlaw");
  });

  it("removes TLD", () => {
    const result = formatOrgName("smithlaw.com");
    expect(result).not.toContain(".com");
  });
});
