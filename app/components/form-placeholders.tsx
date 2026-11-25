"use client";

import { useEffect } from "react";

const placeholderInputTypes = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function labelText(label: HTMLLabelElement) {
  return (label.textContent ?? "")
    .replace(/\s*\(optional[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactFormField(label: HTMLLabelElement) {
  const id = label.htmlFor;
  const control = id ? document.getElementById(id) : null;
  if (
    !(control instanceof HTMLInputElement) &&
    !(control instanceof HTMLTextAreaElement) &&
    !(control instanceof HTMLSelectElement)
  ) {
    return;
  }

  const text = labelText(label);
  if (!text) return;

  if (control instanceof HTMLSelectElement) {
    if (
      Array.from(control.options).some(
        (option) => option.value === "",
      )
    ) {
      label.classList.add("form-label-placeholder");
    }
    return;
  }

  if (
    control instanceof HTMLInputElement &&
    !placeholderInputTypes.has(control.type)
  ) {
    return;
  }

  if (
    !control.placeholder ||
    control.dataset.formLabelPlaceholder === "generated"
  ) {
    control.placeholder = text;
    control.dataset.formLabelPlaceholder = "generated";
  }
  label.classList.add("form-label-placeholder");
}

function compactFormFields() {
  document
    .querySelectorAll<HTMLLabelElement>("label.form-label[for]")
    .forEach(compactFormField);
}

export function FormPlaceholders() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compactFormFields);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
