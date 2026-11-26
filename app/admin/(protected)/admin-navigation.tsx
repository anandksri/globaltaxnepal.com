"use client";

import {
  Activity,
  BookOpenCheck,
  CheckSquare,
  Building2,
  CircleDollarSign,
  CircleUserRound,
  Files,
  GraduationCap,
  LayoutDashboard,
  Mail,
  ReceiptText,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminModule, PermissionAction } from "@prisma/client";
import type { AdminIdentity } from "@/lib/admin/auth";

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
      { label: "Website enquiries", href: "/admin/enquiries", icon: Mail },
      { label: "My tasks", href: "/admin/my-tasks", icon: CheckSquare },
      { label: "Assign tasks", href: "/admin/tax/compliance", icon: CheckSquare },
      { label: "Business summary", href: "/admin#business-summary", icon: Building2 },
      { label: "Recent activity", href: "/admin#recent-activity", icon: Activity },
    ],
  },
  {
    title: "Clients",
    items: [
      { label: "Client management", href: "/admin/clients", icon: Users },
      { label: "Client monthly data", href: "/admin/clients/monthly-data", icon: BookOpenCheck },
      { label: "Student details", href: "/admin/students", icon: GraduationCap },
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
    title: "Settings",
    items: [
      { label: "Company profile", href: "/admin/settings", icon: Building2 },
      { label: "Staff management", href: "/admin/settings/staff", icon: Users },
      { label: "Staff salary register", href: "/admin/settings/staff/salary", icon: BookOpenCheck },
      { label: "Roles and permissions", href: "/admin/settings/roles", icon: Settings },
      { label: "Account settings", href: "/admin/settings/account", icon: CircleUserRound },
    ],
  },
];

function requiredPermission(href: string) {
  if (href === "/admin/my-tasks") return null;
  if (href.startsWith("/admin/clients")) return AdminModule.CLIENTS;
  if (href.startsWith("/admin/students")) return AdminModule.STUDENTS;
  if (href.startsWith("/admin/billing") || href.startsWith("/admin/details-bills")) return AdminModule.BILLING;
  if (href.startsWith("/admin/receipt-vouchers") || href.startsWith("/admin/payment-vouchers")) return AdminModule.VOUCHERS;
  if (href.startsWith("/admin/accounts")) return AdminModule.ACCOUNTS;
  if (href.startsWith("/admin/documents")) return AdminModule.DOCUMENTS;
  if (href.startsWith("/admin/tax")) return AdminModule.TAX;
  if (href.startsWith("/admin/reports")) return AdminModule.REPORTS;
  if (href === "/admin/settings") return AdminModule.SETTINGS;
  if (href.startsWith("/admin/settings/staff")) return AdminModule.STAFF_MANAGEMENT;
  if (href === "/admin/settings/roles") return null;
  if (href === "/admin/settings/account") return null;
  return AdminModule.DASHBOARD;
}

export function AdminNavigation({ admin }: { admin: AdminIdentity }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="space-y-5">
      {navigationSections.map((section) => {
        const items = section.items.filter(({ href }) => {
          if (!href || admin.roleName === "SUPER_ADMIN") return true;
          if (href.startsWith("/admin/tax")) return false;
          if (href === "/admin/clients/monthly-data" && !admin.permissions.some((permission) =>
            permission.module === AdminModule.DOCUMENTS && permission.action === PermissionAction.VIEW
          )) return false;
          if (href === "/admin/settings/roles") return false;
          if (href === "/admin/settings/account") return true;
          const module = requiredPermission(href);
          if (module === null) return true;
          return module !== null && admin.permissions.some((permission) =>
            permission.module === module && permission.action === PermissionAction.VIEW
          );
        });
        if (items.length === 0) return null;
        return (
        <section key={section.title}>
          <h2 className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/55">
            {section.title}
          </h2>
          <ul className="mt-1.5 space-y-0.5">
            {items.map(({ href, icon: Icon, label }) => {
              const isActive = (href === "/admin/clients" && pathname.startsWith("/admin/clients/monthly-data")) ||
                (href === "/admin/settings/staff" && pathname.startsWith("/admin/settings/staff/salary"))
                ? false
                : href === "/admin"
                ? pathname === "/admin"
                : href === "/admin/settings"
                  ? pathname === href
                : href === "/admin/reports" || href === "/admin/tax"
                  ? pathname === href
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
        );
      })}
    </nav>
  );
}
