export default function ClientsLoading() {
  return (
    <div aria-label="Loading clients" className="space-y-4" role="status">
      <span className="sr-only">Loading clients…</span>
      <div className="h-14 border border-border bg-surface" />
      <div className="h-80 border border-border bg-surface" />
    </div>
  );
}
