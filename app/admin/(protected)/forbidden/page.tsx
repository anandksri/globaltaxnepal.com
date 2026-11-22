import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Access restricted" };

export default function ForbiddenPage() {
  return <section className="mx-auto max-w-xl border border-border bg-surface p-6"><h2 className="font-semibold text-primary">Access restricted</h2><p className="mt-2 text-sm text-text-secondary">Your current role does not have permission to access that area. Contact a Super Admin if you need access.</p><Link className="button button-secondary mt-4" href="/admin">Return to dashboard</Link></section>;
}
