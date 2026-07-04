/**
 * @jest-environment jsdom
 */
import { renderForm } from "@/lib/renderer";
import type { Field, Theme } from "@/types/workflow";

const defaultTheme: Theme = {
  bgColor: "#FBF8F2",
  font: "Inter",
  radius: 6,
  density: "spacious",
  buttonColor: "#1F6F54",
  buttonTextColor: "#FFFFFF",
};

describe("renderForm", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe("TextField rendering", () => {
    it("renders a text input", () => {
      const schema: Field[] = [
        { id: "field-1", type: "text", label: "Company Name", required: true, placeholder: "Acme Corp" },
      ];
      renderForm(container, schema, defaultTheme);
      expect(container.querySelector('input[type="text"]')).not.toBeNull();
    });

    it("shows the field label", () => {
      const schema: Field[] = [
        { id: "field-1", type: "text", label: "Company Name", required: false },
      ];
      renderForm(container, schema, defaultTheme);
      expect(container.textContent).toContain("Company Name");
    });

    it("shows clause number", () => {
      const schema: Field[] = [
        { id: "f1", type: "text", label: "First", required: false },
        { id: "f2", type: "text", label: "Second", required: false },
      ];
      renderForm(container, schema, defaultTheme);
      expect(container.textContent).toContain("1.1");
      expect(container.textContent).toContain("1.2");
    });
  });

  describe("EmailField rendering", () => {
    it("renders an email input", () => {
      const schema: Field[] = [
        { id: "field-1", type: "email", label: "Email", required: true },
      ];
      renderForm(container, schema, defaultTheme);
      expect(container.querySelector('input[type="email"]')).not.toBeNull();
    });
  });

  describe("DropdownField rendering", () => {
    it("renders a select element", () => {
      const schema: Field[] = [
        { id: "field-1", type: "dropdown", label: "Entity Type", required: true, options: ["LLC", "C-Corp", "S-Corp"] },
      ];
      renderForm(container, schema, defaultTheme);
      expect(container.querySelector("select")).not.toBeNull();
    });

    it("renders all options plus placeholder", () => {
      const schema: Field[] = [
        { id: "field-1", type: "dropdown", label: "Entity Type", required: true, options: ["LLC", "C-Corp", "S-Corp"] },
      ];
      renderForm(container, schema, defaultTheme);
      const options = container.querySelectorAll("option");
      expect(options.length).toBe(4); // 3 options + 1 placeholder
    });
  });

  describe("RadioField rendering", () => {
    it("renders radio inputs", () => {
      const schema: Field[] = [
        { id: "field-1", type: "radio", label: "Urgency", required: true, options: ["Low", "Medium", "High"] },
      ];
      renderForm(container, schema, defaultTheme);
      expect(container.querySelectorAll('input[type="radio"]').length).toBe(3);
    });

    it("shows urgency warning when High is selected", () => {
      const schema: Field[] = [
        { id: "field-1", type: "radio", label: "Urgency", required: true, options: ["Low", "Medium", "High"] },
      ];
      renderForm(container, schema, defaultTheme);

      const highRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
        (r) => (r as HTMLInputElement).value === "High"
      ) as HTMLInputElement;
      highRadio.click();

      const warningEl = Array.from(container.querySelectorAll("div")).find(
        (d) => d.textContent?.trim() === "⚠ Flagged for same-day attorney review"
      ) as HTMLElement | undefined;
      expect(warningEl?.style.display).toBe("flex");
    });

    it("hides urgency warning when Low is selected", () => {
      const schema: Field[] = [
        { id: "field-1", type: "radio", label: "Urgency", required: true, options: ["Low", "Medium", "High"] },
      ];
      renderForm(container, schema, defaultTheme);

      const lowRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find(
        (r) => (r as HTMLInputElement).value === "Low"
      ) as HTMLInputElement;
      lowRadio.click();

      const warningEl = Array.from(container.querySelectorAll("div")).find(
        (d) => d.textContent?.trim() === "⚠ Flagged for same-day attorney review"
      ) as HTMLElement | undefined;
      expect(warningEl?.style.display).toBe("none");
    });
  });

  describe("DynamicListField rendering", () => {
    it("renders add row button", () => {
      const schema: Field[] = [
        {
          id: "field-1",
          type: "dynamic-list",
          label: "Shareholders",
          required: true,
          subFields: [
            { id: "sf-1", label: "Name", type: "text", required: false },
            { id: "sf-2", label: "Equity %", type: "text", required: false },
          ],
        },
      ];
      renderForm(container, schema, defaultTheme);
      expect(container.textContent).toContain("Add row");
    });
  });

  describe("theme application", () => {
    it("sets inline style on container", () => {
      renderForm(container, [], defaultTheme);
      expect(container.getAttribute("style")).toBeTruthy();
    });
  });

  describe("cleanup function", () => {
    it("returns a cleanup function", () => {
      const cleanup = renderForm(container, [], defaultTheme, "Test Form");
      expect(typeof cleanup).toBe("function");
    });

    it("cleanup clears the container", () => {
      const schema: Field[] = [
        { id: "f1", type: "text", label: "Test", required: false },
      ];
      const cleanup = renderForm(container, schema, defaultTheme, "Test Form");
      expect(container.children.length).toBeGreaterThan(0);
      cleanup();
      expect(container.children.length).toBe(0);
    });
  });
});
