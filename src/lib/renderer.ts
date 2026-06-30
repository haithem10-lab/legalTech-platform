import type { Field, Theme } from "@/types/workflow";

// ─── Color helpers ─────────────────────────────────────────────────────────────

function isDark(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.35;
}

interface RenderColors {
  text: string;
  muted: string;
  subLabel: string;
  divider: string;
}

function themeColors(bgColor: string): RenderColors {
  return isDark(bgColor)
    ? { text: "#E8E4DC", muted: "#9B9387", subLabel: "#A09890", divider: "rgba(255,255,255,0.14)" }
    : { text: "#1C2127", muted: "#8A8270", subLabel: "#6B6459", divider: "#E8E2D9" };
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

function inputStyle(radius: number): string {
  return [
    "width:100%",
    "padding:9px 12px",
    "font-size:14px",
    "border:1px solid #D6D0C8",
    `border-radius:${radius}px`,
    "outline:none",
    "background:#fff",
    "box-sizing:border-box",
    "font-family:inherit",
    "color:#1C2127",
    "transition:border-color 0.15s",
  ].join(";");
}

function wrapperStyle(gap: string): string {
  return `margin-bottom:${gap};`;
}

// ─── Field builder ─────────────────────────────────────────────────────────────

function buildField(field: Field, theme: Theme, gap: string, index: number, colors: RenderColors): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-field-id", field.id);
  wrapper.style.cssText = wrapperStyle(gap);

  // Clause label row: "1.N  Label text"
  const labelRow = document.createElement("div");
  labelRow.style.cssText = "display:flex;align-items:baseline;gap:8px;margin-bottom:7px;";

  const clause = document.createElement("span");
  clause.textContent = `1.${index + 1}`;
  clause.style.cssText =
    "font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;color:#44645D;flex-shrink:0;letter-spacing:0.02em;";

  const labelEl = document.createElement("label");
  labelEl.textContent = field.label + (field.required ? " *" : "");
  labelEl.style.cssText = `font-size:13px;font-weight:500;color:${colors.text};line-height:1.4;`;

  labelRow.appendChild(clause);
  labelRow.appendChild(labelEl);
  wrapper.appendChild(labelRow);

  // ── Input by type ──────────────────────────────────────────────────────────

  switch (field.type) {
    case "text":
    case "email": {
      const input = document.createElement("input");
      input.type = field.type;
      input.required = field.required;
      input.placeholder = field.placeholder ?? "";
      input.style.cssText = inputStyle(theme.radius);
      input.addEventListener("focus",  () => { input.style.borderColor = "#44645D"; });
      input.addEventListener("blur",   () => { input.style.borderColor = "#D6D0C8"; });
      if (field.type === "text" && field.validation?.maxLength) {
        input.maxLength = field.validation.maxLength;
      }
      wrapper.appendChild(input);
      break;
    }

    case "dropdown": {
      const select = document.createElement("select");
      select.required = field.required;
      select.style.cssText = inputStyle(theme.radius) + ";appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238A8270' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;cursor:pointer;";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = field.placeholder ?? "Select an option…";
      ph.disabled = true;
      ph.selected = true;
      select.appendChild(ph);
      field.options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      select.addEventListener("focus", () => { select.style.borderColor = "#44645D"; });
      select.addEventListener("blur",  () => { select.style.borderColor = "#D6D0C8"; });
      wrapper.appendChild(select);
      break;
    }

    case "radio": {
      const group = document.createElement("div");
      group.style.cssText = "display:flex;flex-direction:column;gap:8px;";

      const warning = document.createElement("div");
      warning.style.cssText =
        "background:#FBEAE8;color:#B23A2E;padding:8px 12px;border-radius:4px;font-size:11px;margin-top:8px;display:none;align-items:center;gap:6px;";
      warning.textContent = "⚠ Flagged for same-day attorney review";

      field.options.forEach((opt) => {
        const row = document.createElement("label");
        row.style.cssText =
          `display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;color:${colors.text};padding:8px 12px;border:1px solid ${colors.divider};border-radius:` +
          theme.radius +
          "px;transition:border-color 0.15s,background 0.15s;";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = field.id;
        radio.value = opt;
        radio.required = field.required;
        radio.style.cssText = "accent-color:#44645D;width:15px;height:15px;flex-shrink:0;";
        radio.addEventListener("change", () => {
          group.querySelectorAll("label").forEach((l) => {
            (l as HTMLElement).style.borderColor = "#E8E2D9";
            (l as HTMLElement).style.background = "transparent";
          });
          row.style.borderColor = "#44645D";
          row.style.background = "#F0FDF8";
          warning.style.display = radio.value.toLowerCase() === "high" ? "flex" : "none";
        });
        row.appendChild(radio);
        row.appendChild(document.createTextNode(opt));
        group.appendChild(row);
      });

      wrapper.appendChild(group);
      wrapper.appendChild(warning);
      break;
    }

    case "file": {
      const dropzone = document.createElement("div");
      dropzone.setAttribute("data-dropzone", "");
      dropzone.style.cssText = `padding:20px;border:2px dashed #D6D0C8;border-radius:${theme.radius}px;background:#FAFAF8;text-align:center;cursor:pointer;transition:border-color 0.15s,background 0.15s;`;
      const input = document.createElement("input");
      input.type = "file";
      input.required = field.required;
      input.style.cssText = "display:none;";
      input.accept = ".pdf,.docx,.jpg,.jpeg,.png";
      const hint = document.createElement("p");
      hint.setAttribute("data-hint", "");
      hint.textContent = field.placeholder ?? "Click or drop a file to upload";
      hint.style.cssText = "font-size:13px;color:#8A8270;margin:0;";
      const acceptedLabel = document.createElement("p");
      acceptedLabel.textContent = "Accepted: PDF, DOCX, JPG, PNG · Max 10MB";
      acceptedLabel.style.cssText = "font-size:11px;color:#8A8378;margin:6px 0 0;";
      dropzone.addEventListener("mouseenter", () => { dropzone.style.borderColor = "#44645D"; });
      dropzone.addEventListener("mouseleave", () => { dropzone.style.borderColor = "#D6D0C8"; });
      dropzone.addEventListener("click", () => input.click());
      input.addEventListener("change", () => {
        if (input.files?.[0]) hint.textContent = input.files[0].name;
      });
      dropzone.appendChild(hint);
      dropzone.appendChild(acceptedLabel);
      dropzone.appendChild(input);
      wrapper.appendChild(dropzone);
      break;
    }

    case "dynamic-list": {
      const container = document.createElement("div");
      container.setAttribute("data-rows-container", "");
      container.style.cssText = "display:flex;flex-direction:column;gap:8px;";
      const subFields = field.subFields;

      const addRow = () => {
        const row = document.createElement("div");
        row.setAttribute("data-row", "");
        row.style.cssText = `display:flex;gap:8px;align-items:flex-end;background:#F9F8F5;border:1px solid #E8E2D9;border-radius:${theme.radius}px;padding:10px;`;
        subFields.forEach((sub) => {
          const sw = document.createElement("div");
          sw.style.cssText = "flex:1;min-width:0;";
          const sl = document.createElement("label");
          sl.textContent = sub.label;
          sl.style.cssText = `display:block;font-size:12px;font-weight:500;color:${colors.subLabel};margin-bottom:4px;`;
          const si = document.createElement("input");
          si.type = sub.type === "number" ? "number" : sub.type;
          si.required = sub.required;
          si.style.cssText = `width:100%;padding:7px 10px;font-size:13px;border:1px solid #D6D0C8;border-radius:${theme.radius}px;outline:none;box-sizing:border-box;font-family:inherit;background:#fff;color:#1C2127;`;
          si.addEventListener("focus", () => { si.style.borderColor = "#44645D"; });
          si.addEventListener("blur",  () => { si.style.borderColor = "#D6D0C8"; });
          sw.appendChild(sl);
          sw.appendChild(si);
          row.appendChild(sw);
        });
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "×";
        del.style.cssText = `padding:6px 10px;font-size:16px;line-height:1;border:none;background:#EDE8DD;border-radius:${theme.radius}px;cursor:pointer;flex-shrink:0;color:#6B6459;`;
        del.addEventListener("click", () => { if (container.children.length > 1) row.remove(); });
        row.appendChild(del);
        container.appendChild(row);
      };

      addRow();

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.textContent = "+ Add row";
      addBtn.style.cssText = `font-size:13px;padding:6px 14px;border:1px dashed #C9C2B4;border-radius:${theme.radius}px;background:transparent;cursor:pointer;font-family:inherit;color:#6B6459;margin-top:2px;transition:border-color 0.15s,color 0.15s;`;
      addBtn.addEventListener("mouseenter", () => { addBtn.style.borderColor = "#44645D"; addBtn.style.color = "#44645D"; });
      addBtn.addEventListener("mouseleave", () => { addBtn.style.borderColor = "#C9C2B4"; addBtn.style.color = "#6B6459"; });
      addBtn.addEventListener("click", addRow);

      wrapper.appendChild(container);
      wrapper.appendChild(addBtn);
      break;
    }
  }

  if (field.helperText) {
    const p = document.createElement("p");
    p.textContent = field.helperText;
    p.style.cssText = `font-size:12px;color:${colors.muted};margin:5px 0 0;`;
    wrapper.appendChild(p);
  }

  return wrapper;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function renderForm(
  container: HTMLElement,
  schema: Field[],
  theme: Theme,
  workflowName = ""
): () => void {
  container.innerHTML = "";

  const gap = theme.density === "compact" ? "14px" : "22px";
  const colors = themeColors(theme.bgColor);

  container.style.cssText = `
    font-family: ${theme.font}, system-ui, sans-serif;
    background: ${theme.bgColor};
    padding: 38px 40px 40px 70px;
    color: ${colors.text};
    position: relative;
  `;

  const form = document.createElement("form");
  form.addEventListener("submit", (e) => e.preventDefault());

  // ── Form header ────────────────────────────────────────────────────────────
  if (workflowName) {
    const header = document.createElement("div");
    header.style.cssText = `margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid ${colors.divider};`;

    const title = document.createElement("h2");
    title.textContent = workflowName;
    title.style.cssText =
      `font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:${colors.text};margin:0 0 5px;line-height:1.25;`;

    const sub = document.createElement("p");
    sub.textContent = "New Client Intake — please complete all clauses below.";
    sub.style.cssText = `font-size:13px;color:${colors.muted};margin:0;`;

    header.appendChild(title);
    header.appendChild(sub);
    form.appendChild(header);
  }

  // ── Fields ─────────────────────────────────────────────────────────────────
  if (schema.length > 0) {
    schema.forEach((field, i) => form.appendChild(buildField(field, theme, gap, i, colors)));

    const btnPad  = theme.buttonSize === "sm" ? "9px 14px" : theme.buttonSize === "lg" ? "16px 22px" : "12px 16px";
    const btnSize = theme.buttonSize === "sm" ? "13px"     : theme.buttonSize === "lg" ? "15px"      : "14px";

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Submit intake";
    submit.style.cssText = `
      width: 100%;
      margin-top: 10px;
      padding: ${btnPad};
      font-size: ${btnSize};
      font-weight: 600;
      color: ${theme.buttonTextColor};
      background: ${theme.buttonColor};
      border: none;
      border-radius: ${theme.radius}px;
      cursor: pointer;
      font-family: inherit;
      letter-spacing: 0.01em;
      transition: opacity 0.15s;
    `;
    submit.addEventListener("mouseenter", () => { submit.style.opacity = "0.88"; });
    submit.addEventListener("mouseleave", () => { submit.style.opacity = "1"; });
    form.appendChild(submit);
  } else {
    const empty = document.createElement("p");
    empty.textContent = "No fields yet — add one in the builder.";
    empty.style.cssText = `font-size:13px;color:${colors.muted};text-align:center;padding:24px 0;margin:0;`;
    form.appendChild(empty);
  }

  container.appendChild(form);

  return () => { container.innerHTML = ""; };
}
