"use client";

export default function ClientsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      aria-labelledby="clients-error-heading"
      className="border border-error/30 bg-surface p-6"
      role="alert"
    >
      <h2
        className="text-base font-semibold text-primary"
        id="clients-error-heading"
      >
        Client records are temporarily unavailable
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        The request could not be completed. Try again, or contact the system administrator.
      </p>
      <button
        className="button button-secondary mt-4"
        onClick={() => reset()}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
