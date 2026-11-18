"use client";

import {
  Activity,
  BookOpenCheck,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  Files,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
};

const navigationSections: { title: string; items: NavigationItem[] }[] = [
  {
    title: "Dashboard",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Business summary", href: "/admin#business-summary", icon: Building2 },
      { label: "Recent activity", href: "/admin#recent-activity", icon: Activity },
    ],
  },
  {
    title: "Clients",
    items: [
      { label: "Client management", href: "/admin/clients", icon: Users },
      { label: "Client details", icon: ClipboardList },
      { label: "Documents", href: "/admin/documents", icon: Files },
    ],
  },
  {
    title: "Billing",
    items: [
      { label: "Normal Bill", href: "/admin/billing", icon: ReceiptText },
      { label: "Details Bill", href: "/admin/details-bills", icon: BookOpenCheck },
      { label: "Receipt Voucher", href: "/admin/receipt-vouchers", icon: CircleDollarSign },
      { label: "Payment Voucher", href: "/admin/payment-vouchers", icon: Wallet },
    ],
  },
  {
    title: "Accounts",
    items: [
      { label: "Accounts overview", href: "/admin/accounts", icon: ChartNoAxesCombined },
      { label: "Income", href: "/admin/accounts/income", icon: CircleDollarSign },
      { label: "Expenses", href: "/admin/accounts/expenses", icon: Wallet },
      { label: "Transactions", icon: Activity },
    ],
  },
  {
    title: "Tax Management",
    items: [
      { label: "Tax & compliance overview", href: "/admin/tax", icon: FileCheck2 },
      { label: "Tax records", href: "/admin/tax/records", icon: Files },
      { label: "Compliance tracking", href: "/admin/tax/compliance", icon: ClipboardList },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Billing reports", icon: ReceiptText },
      { label: "Client reports", icon: Users },
      { label: "Income and expense reports", icon: ChartNoAxesCombined },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Company profile", icon: Building2 },
      { label: "User management", icon: Users },
      { label: "Account settings", icon: Settings },
    ],
  },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="space-y-5">
      {navigationSections.map((section) => (
        <section key={section.title}>
          <h2 className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/55">
            {section.title}
          </h2>
          <ul className="mt-1.5 space-y-0.5">
            {section.items.map(({ href, icon: Icon, label }) => {
              const isActive = href === "/admin"
                ? pathname === "/admin"
                : href === "/admin/accounts"
                  ? pathname === href
                  : Boolean(href && pathname.startsWith(href));

              return (
                <li key={label}>
                  {href ? (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-3 rounded-sm px-3 text-sm transition-colors duration-200 ease-out ${
                        isActive
                          ? "bg-white/10 font-medium text-white"
                          : "text-white/75 hover:bg-white/5 hover:text-white"
                      }`}
                      href={href}
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-4 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span>{label}</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="flex min-h-10 items-center gap-3 rounded-sm px-3 text-sm text-white/45"
                      title="Planned for a future phase"
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-4 shrink-0"
                        strokeWidth={1.75}
                      />
                      <span>{label}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
