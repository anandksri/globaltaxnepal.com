export default function BillingLoading() {
  return (
    <div aria-label="Loading billing records" className="space-y-4" role="status">
      <span className="sr-only">Loading billing records…</span>
      <div className="h-14 border border-border bg-surface" />
      <div className="h-72 border border-border bg-surface" />
    </div>
  );
}
