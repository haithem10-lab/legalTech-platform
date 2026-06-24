import { renderForm } from "../lib/renderer";
import type { PublicWorkflow } from "../types/workflow";

(function () {
  // Find the script tag that loaded us
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    "script[data-workflow-id]"
  );
  const script = scripts[scripts.length - 1];
  if (!script) return;

  const workflowId = script.getAttribute("data-workflow-id");
  if (!workflowId) return;

  // Derive app origin from the script's own src
  let appOrigin = "";
  try {
    appOrigin = new URL(script.src).origin;
  } catch {
    appOrigin = window.location.origin;
  }

  // Mount div — inserted immediately after the script tag
  const mount = document.createElement("div");
  mount.setAttribute("data-legalform", workflowId);
  mount.style.cssText =
    "font-family:system-ui,sans-serif;box-sizing:border-box;";
  script.parentNode?.insertBefore(mount, script.nextSibling);

  function showMessage(text: string, isError = false) {
    mount.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = text;
    p.style.cssText = `
      font-size: 14px;
      color: ${isError ? "#B23A2E" : "#6B7280"};
      padding: 16px;
      margin: 0;
      border: 1px solid ${isError ? "#FECACA" : "#E5E7EB"};
      border-radius: 8px;
      background: ${isError ? "#FEF2F2" : "#F9FAFB"};
    `;
    mount.appendChild(p);
  }

  function showSuccess() {
    mount.innerHTML = "";
    const box = document.createElement("div");
    box.style.cssText = `
      padding: 24px;
      text-align: center;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      background: #F0FDF4;
    `;
    const h = document.createElement("p");
    h.textContent = "Thank you — your form has been submitted.";
    h.style.cssText =
      "font-size:16px;font-weight:600;color:#166534;margin:0 0 4px;";
    const sub = document.createElement("p");
    sub.textContent = "We'll be in touch shortly.";
    sub.style.cssText = "font-size:13px;color:#166534;margin:0;opacity:.8;";
    box.appendChild(h);
    box.appendChild(sub);
    mount.appendChild(box);
  }

  function clearFieldErrors(container: HTMLElement) {
    container
      .querySelectorAll("[data-field-error]")
      .forEach((el) => el.remove());
  }

  function showFieldErrors(
    container: HTMLElement,
    errors: Record<string, string>
  ) {
    clearFieldErrors(container);
    for (const [fieldId, message] of Object.entries(errors)) {
      const fieldEl = container.querySelector(`[data-field-id="${fieldId}"]`);
      if (fieldEl) {
        const errEl = document.createElement("p");
        errEl.setAttribute("data-field-error", "");
        errEl.textContent = message;
        errEl.style.cssText =
          "font-size:12px;color:#B23A2E;margin:4px 0 0;padding:0;";
        fieldEl.appendChild(errEl);
      }
    }
  }

  // Loading state
  showMessage("Loading form…");

  fetch(`${appOrigin}/api/public/config/${workflowId}?t=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
  })
    .then(async (res) => {
      if (res.status === 403) {
        showMessage("This form is not available on this domain.", true);
        return;
      }
      if (res.status === 404) {
        showMessage("Form not found or unavailable.", true);
        return;
      }
      if (!res.ok) {
        showMessage("Failed to load form. Please try again later.", true);
        return;
      }

      const workflow: PublicWorkflow = await res.json();

      // Clear loading message and render
      mount.innerHTML = "";

      // Wrapper with CSS reset so host-page styles don't leak in
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        all: initial;
        display: block;
        font-family: ${workflow.theme.font}, system-ui, sans-serif;
        box-sizing: border-box;
      `;
      mount.appendChild(wrapper);

      const cleanup = renderForm(wrapper, workflow.schema, workflow.theme);

      // Intercept form submit
      const form = wrapper.querySelector("form");
      if (!form) return;

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFieldErrors(wrapper);

        // Collect values field-by-field using the schema + data-field-id markers
        // so every field type is captured regardless of whether inputs have `name`.
        const data: Record<string, unknown> = {};

        for (const field of workflow.schema) {
          const fieldEl = wrapper.querySelector(`[data-field-id="${field.id}"]`);
          if (!fieldEl) continue;

          switch (field.type) {
            case "text":
            case "email": {
              const input = fieldEl.querySelector<HTMLInputElement>("input");
              data[field.id] = input?.value ?? "";
              break;
            }
            case "dropdown": {
              const select = fieldEl.querySelector<HTMLSelectElement>("select");
              data[field.id] = select?.value ?? "";
              break;
            }
            case "radio": {
              const checked = fieldEl.querySelector<HTMLInputElement>(
                'input[type="radio"]:checked'
              );
              data[field.id] = checked?.value ?? "";
              break;
            }
            case "file": {
              const input = fieldEl.querySelector<HTMLInputElement>(
                'input[type="file"]'
              );
              data[field.id] = input?.files?.[0]?.name ?? "";
              break;
            }
            case "dynamic-list": {
              const container = fieldEl.querySelector("[data-rows-container]");
              const rows: Record<string, string>[] = [];
              if (container) {
                const rowEls = container.querySelectorAll("[data-row]");
                rowEls.forEach((rowEl) => {
                  const rowData: Record<string, string> = {};
                  const inputs = rowEl.querySelectorAll<HTMLInputElement>("input");
                  inputs.forEach((input, i) => {
                    const subField = field.subFields[i];
                    if (subField) rowData[subField.id] = input.value;
                  });
                  rows.push(rowData);
                });
              }
              data[field.id] = rows;
              break;
            }
          }
        }

        const submitBtn = form.querySelector<HTMLButtonElement>(
          'button[type="submit"]'
        );
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Submitting…";
        }

        try {
          const submitRes = await fetch(
            `${appOrigin}/api/public/submit/${workflowId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            }
          );

          if (submitRes.ok) {
            cleanup();
            showSuccess();
            return;
          }

          // Re-enable submit button for retry
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
          }

          const errBody = await submitRes.json().catch(() => ({}));

          if (submitRes.status === 400 && errBody.errors) {
            showFieldErrors(wrapper, errBody.errors as Record<string, string>);
            // Scroll to first error
            const firstErr = wrapper.querySelector("[data-field-error]");
            firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            const p = document.createElement("p");
            p.textContent =
              errBody.error ?? "Submission failed — please try again.";
            p.style.cssText =
              "font-size:13px;color:#B23A2E;margin:8px 0 0;";
            form.appendChild(p);
          }
        } catch {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
          }
          const p = document.createElement("p");
          p.textContent = "Network error — please check your connection and try again.";
          p.style.cssText = "font-size:13px;color:#B23A2E;margin:8px 0 0;";
          form.appendChild(p);
        }
      });
    })
    .catch(() => {
      showMessage("Failed to load form. Please try again later.", true);
    });
})();
