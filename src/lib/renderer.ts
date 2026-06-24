import type { Field, Theme } from "@/types/workflow";

function inputStyle(radius: number) {
  return `width:100%;padding:8px 12px;font-size:14px;border:1px solid #D1D5DB;border-radius:${radius}px;outline:none;background:#fff;box-sizing:border-box;font-family:inherit;color:inherit;`;
}

function labelStyle() {
  return `display:block;font-size:13px;font-weight:500;margin-bottom:4px;`;
}

function wrapperStyle(gap: string) {
  return `margin-bottom:${gap};`;
}

function buildField(field: Field, theme: Theme, gap: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-field-id", field.id);
  wrapper.style.cssText = wrapperStyle(gap);

  const label = document.createElement("label");
  label.textContent = field.label + (field.required ? " *" : "");
  label.style.cssText = labelStyle();
  wrapper.appendChild(label);

  switch (field.type) {
    case "text":
    case "email": {
      const input = document.createElement("input");
      input.type = field.type;
      input.required = field.required;
      input.placeholder = field.placeholder ?? "";
      input.style.cssText = inputStyle(theme.radius);
      if (field.type === "text" && field.validation?.maxLength) {
        input.maxLength = field.validation.maxLength;
      }
      wrapper.appendChild(input);
      break;
    }
    case "dropdown": {
      const select = document.createElement("select");
      select.required = field.required;
      select.style.cssText = inputStyle(theme.radius);
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = field.placeholder ?? "Select an option";
      ph.disabled = true;
      ph.selected = true;
      select.appendChild(ph);
      field.options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      wrapper.appendChild(select);
      break;
    }
    case "radio": {
      const group = document.createElement("div");
      group.style.cssText = "display:flex;flex-direction:column;gap:8px;";

      const warning = document.createElement("div");
      warning.style.cssText = "background:#FBEAE8;color:#B23A2E;padding:8px 12px;border-radius:4px;font-size:11px;margin-top:8px;display:none;align-items:center;gap:6px;";
      warning.textContent = "⚠ Flagged for same-day attorney review";

      field.options.forEach((opt) => {
        const row = document.createElement("label");
        row.style.cssText = "display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = field.id;
        radio.value = opt;
        radio.required = field.required;
        radio.addEventListener("change", () => {
          const isHigh = radio.value.toLowerCase() === "high";
          warning.style.display = isHigh ? "flex" : "none";
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
      dropzone.style.cssText = `padding:20px;border:2px dashed #D1D5DB;border-radius:${theme.radius}px;background:#FAFAFA;text-align:center;cursor:pointer;`;
      const input = document.createElement("input");
      input.type = "file";
      input.required = field.required;
      input.style.cssText = "display:none;";
      if (field.acceptedTypes.length) input.accept = field.acceptedTypes.join(",");
      const hint = document.createElement("p");
      hint.textContent =
        field.placeholder ??
        `Upload ${field.acceptedTypes.join(", ") || "file"} (max ${Math.round(field.maxSizeBytes / 1_000_000)}MB)`;
      hint.style.cssText = "font-size:13px;color:#6B7280;margin:0;";
      dropzone.addEventListener("click", () => input.click());
      input.addEventListener("change", () => {
        if (input.files?.[0]) hint.textContent = input.files[0].name;
      });
      dropzone.appendChild(hint);
      dropzone.appendChild(input);
      wrapper.appendChild(dropzone);
      break;
    }
    case "dynamic-list": {
      const container = document.createElement("div");
      container.setAttribute("data-rows-container", "");
      container.style.cssText = "display:flex;flex-direction:column;gap:8px;";
      // Capture narrowed subFields before entering the closure — TypeScript
      // doesn't narrow discriminated unions through function closures.
      const subFields = field.subFields;

      const addRow = () => {
        const row = document.createElement("div");
        row.setAttribute("data-row", "");
        row.style.cssText = "display:flex;gap:8px;align-items:flex-end;";
        subFields.forEach((sub) => {
          const sw = document.createElement("div");
          sw.style.cssText = "flex:1;min-width:0;";
          const sl = document.createElement("label");
          sl.textContent = sub.label;
          sl.style.cssText = "display:block;font-size:12px;font-weight:500;margin-bottom:2px;";
          const si = document.createElement("input");
          si.type = sub.type === "number" ? "number" : sub.type;
          si.required = sub.required;
          si.style.cssText = `width:100%;padding:6px 10px;font-size:13px;border:1px solid #D1D5DB;border-radius:${theme.radius}px;outline:none;box-sizing:border-box;font-family:inherit;`;
          sw.appendChild(sl);
          sw.appendChild(si);
          row.appendChild(sw);
        });
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "×";
        del.style.cssText = `padding:6px 10px;font-size:16px;line-height:1;border:none;background:#F3F4F6;border-radius:${theme.radius}px;cursor:pointer;flex-shrink:0;`;
        del.addEventListener("click", () => {
          if (container.children.length > 1) row.remove();
        });
        row.appendChild(del);
        container.appendChild(row);
      };

      addRow();

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.textContent = "+ Add row";
      addBtn.style.cssText = `font-size:13px;padding:4px 12px;border:1px dashed #9CA3AF;border-radius:${theme.radius}px;background:transparent;cursor:pointer;font-family:inherit;margin-top:4px;`;
      addBtn.addEventListener("click", addRow);

      wrapper.appendChild(container);
      wrapper.appendChild(addBtn);
      break;
    }
  }

  if (field.helperText) {
    const p = document.createElement("p");
    p.textContent = field.helperText;
    p.style.cssText = "font-size:12px;color:#6B7280;margin:4px 0 0;";
    wrapper.appendChild(p);
  }

  return wrapper;
}

export function renderForm(
  container: HTMLElement,
  schema: Field[],
  theme: Theme
): () => void {
  container.innerHTML = "";

  const gap = theme.density === "compact" ? "12px" : "20px";

  // Scope all styles to this container via CSS custom properties
  container.style.cssText = `
    font-family: ${theme.font}, system-ui, sans-serif;
    background: ${theme.bgColor};
    padding: 24px;
    border-radius: 8px;
    color: #1C2127;
  `;

  const form = document.createElement("form");
  form.addEventListener("submit", (e) => e.preventDefault());

  schema.forEach((field) => form.appendChild(buildField(field, theme, gap)));

  if (schema.length > 0) {
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Submit";
    submit.style.cssText = `
      width: 100%;
      margin-top: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: ${theme.buttonTextColor};
      background: ${theme.buttonColor};
      border: none;
      border-radius: ${theme.radius}px;
      cursor: pointer;
      font-family: inherit;
    `;
    form.appendChild(submit);
  } else {
    const empty = document.createElement("p");
    empty.textContent = "No fields yet — add one in the builder.";
    empty.style.cssText = "font-size:13px;color:#9CA3AF;text-align:center;padding:24px 0;margin:0;";
    form.appendChild(empty);
  }

  container.appendChild(form);

  return () => {
    container.innerHTML = "";
  };
}
