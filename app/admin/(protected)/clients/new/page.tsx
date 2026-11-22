import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../actions";
import { ClientForm } from "../client-form";
import { requirePermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Add client" };

export default async function NewClientPage() {
  await requirePermission("CLIENTS", "CREATE");
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          className="text-sm font-medium text-secondary hover:text-primary"
          href="/admin/clients"
        >
          ← All clients
        </Link>
        <p className="mt-3 text-sm text-text-secondary">
          Enter the client details you have. Optional information can be added later.
        </p>
      </div>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <ClientForm action={createClient} submitLabel="Create client" />
      </section>
    </div>
  );
}
