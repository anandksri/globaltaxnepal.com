"use client";

import { useEffect } from "react";

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-billing] Page failed to load.", {
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="border border-border bg-surface px-5 py-10 text-center">
      <h2 className="font-semibold text-primary">Billing could not be loaded</h2>
      <p className="mt-1 text-sm text-text-secondary">Please try again. If the problem continues, contact your system administrator.</p>
      <button className="button button-secondary mt-4" onClick={reset} type="button">Try again</button>
    </div>
  );
}
