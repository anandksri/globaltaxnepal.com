"use client";

import { Printer } from "lucide-react";

export function PrintVoucherButton() {
  return (
    <button className="button button-secondary print:hidden" onClick={() => window.print()} type="button">
      <Printer aria-hidden="true" className="size-4" strokeWidth={1.75} />
      Print
    </button>
  );
}
