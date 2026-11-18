"use client";

import { usePathname } from "next/navigation";

export function AdminPageTitle() {
  const pathname = usePathname();
  let title = "Overview";

  if (pathname === "/admin/clients") {
    title = "Clients";
  } else if (pathname === "/admin/clients/new") {
    title = "Add client";
  } else if (pathname === "/admin/billing") {
    title = "Billing";
  } else if (pathname === "/admin/billing/new") {
    title = "Create bill";
  } else if (pathname.endsWith("/edit") && pathname.includes("/billing/")) {
    title = "Edit draft bill";
  } else if (pathname.startsWith("/admin/billing/")) {
    title = "Bill details";
  } else if (pathname === "/admin/details-bills") {
    title = "Details bills";
  } else if (pathname === "/admin/details-bills/new") {
    title = "Create details bill";
  } else if (pathname.includes("/details-bills/") && pathname.endsWith("/edit")) {
    title = "Edit details bill";
  } else if (pathname.startsWith("/admin/details-bills/")) {
    title = "Details bill";
  } else if (pathname === "/admin/receipt-vouchers") {
    title = "Receipt vouchers";
  } else if (pathname === "/admin/receipt-vouchers/new") {
    title = "New receipt voucher";
  } else if (pathname.includes("/receipt-vouchers/") && pathname.endsWith("/edit")) {
    title = "Edit receipt voucher";
  } else if (pathname.startsWith("/admin/receipt-vouchers/")) {
    title = "Receipt voucher";
  } else if (pathname === "/admin/payment-vouchers") {
    title = "Payment vouchers";
  } else if (pathname === "/admin/payment-vouchers/new") {
    title = "New payment voucher";
  } else if (pathname.includes("/payment-vouchers/") && pathname.endsWith("/edit")) {
    title = "Edit payment voucher";
  } else if (pathname.startsWith("/admin/payment-vouchers/")) {
    title = "Payment voucher";
  } else if (pathname === "/admin/accounts") {
    title = "Accounts overview";
  } else if (pathname === "/admin/accounts/income") {
    title = "Income";
  } else if (pathname === "/admin/accounts/income/new") {
    title = "Add income";
  } else if (pathname.includes("/accounts/income/") && pathname.endsWith("/edit")) {
    title = "Edit income";
  } else if (pathname.startsWith("/admin/accounts/income/")) {
    title = "Income details";
  } else if (pathname === "/admin/accounts/expenses") {
    title = "Expenses";
  } else if (pathname === "/admin/accounts/expenses/new") {
    title = "Add expense";
  } else if (pathname.includes("/accounts/expenses/") && pathname.endsWith("/edit")) {
    title = "Edit expense";
  } else if (pathname.startsWith("/admin/accounts/expenses/")) {
    title = "Expense details";
  } else if (pathname.endsWith("/edit")) {
    title = "Edit client";
  } else if (/^\/admin\/clients\/[^/]+$/.test(pathname)) {
    title = "Client details";
  }

  return <>{title}</>;
}
