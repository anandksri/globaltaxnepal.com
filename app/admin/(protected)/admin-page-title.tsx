"use client";

import { usePathname } from "next/navigation";

export function AdminPageTitle() {
  const pathname = usePathname();
  let title = "Overview";

  if (pathname.startsWith("/admin/enquiries")) {
    title = "Website enquiries";
  } else if (pathname.startsWith("/admin/clients/monthly-data")) {
    title = "Client monthly data";
  } else if (pathname === "/admin/clients") {
    title = "Clients";
  } else if (pathname === "/admin/clients/new") {
    title = "Add client";
  } else if (pathname === "/admin/students") {
    title = "Student details";
  } else if (pathname.startsWith("/admin/students/registers/")) {
    title = "Office registers";
  } else if (pathname === "/admin/students/new") {
    title = "Register student";
  } else if (pathname.startsWith("/admin/students/") && pathname.endsWith("/edit")) {
    title = "Edit student";
  } else if (pathname.startsWith("/admin/students/")) {
    title = "Student details";
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
  } else if (pathname === "/admin/documents") {
    title = "Documents";
  } else if (pathname === "/admin/documents/new") {
    title = "Upload document";
  } else if (pathname.includes("/documents/") && pathname.endsWith("/edit")) {
    title = "Edit document details";
  } else if (pathname.startsWith("/admin/documents/")) {
    title = "Document details";
  } else if (pathname === "/admin/tax") {
    title = "Tax & compliance";
  } else if (pathname === "/admin/tax/records") {
    title = "Tax records";
  } else if (pathname === "/admin/tax/records/new") {
    title = "Add tax record";
  } else if (pathname.includes("/tax/records/") && pathname.endsWith("/edit")) {
    title = "Edit tax record";
  } else if (pathname.startsWith("/admin/tax/records/")) {
    title = "Tax record details";
  } else if (pathname === "/admin/tax/compliance") {
    title = "Compliance tracking";
  } else if (pathname === "/admin/tax/compliance/new") {
    title = "Add compliance task";
  } else if (pathname.includes("/tax/compliance/") && pathname.endsWith("/edit")) {
    title = "Edit compliance task";
  } else if (pathname.startsWith("/admin/tax/compliance/")) {
    title = "Compliance task details";
  } else if (pathname === "/admin/reports") {
    title = "Reports";
  } else if (pathname === "/admin/reports/billing") {
    title = "Billing reports";
  } else if (pathname === "/admin/reports/financial") {
    title = "Income and expense reports";
  } else if (pathname === "/admin/reports/clients") {
    title = "Client reports";
  } else if (pathname === "/admin/reports/tax") {
    title = "Tax and compliance reports";
  } else if (pathname === "/admin/settings") {
    title = "Company settings";
  } else if (pathname.startsWith("/admin/settings/staff/salary")) {
    title = "Staff salary register";
  } else if (pathname === "/admin/settings/staff") {
    title = "Staff management";
  } else if (pathname === "/admin/settings/staff/new") {
    title = "Add staff member";
  } else if (pathname.startsWith("/admin/settings/staff/")) {
    title = "Staff account";
  } else if (pathname === "/admin/settings/roles") {
    title = "Roles and permissions";
  } else if (pathname === "/admin/settings/account") {
    title = "Account settings";
  } else if (pathname.endsWith("/edit")) {
    title = "Edit client";
  } else if (/^\/admin\/clients\/[^/]+$/.test(pathname)) {
    title = "Client details";
  }

  return <>{title}</>;
}
