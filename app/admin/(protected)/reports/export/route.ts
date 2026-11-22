import PDFDocument from "pdfkit";
import { requirePermission } from "@/lib/admin/auth";
import {
  getBillingReport,
  getClientReport,
  getFinancialReport,
  getReportsDashboard,
  getTaxReport,
} from "@/lib/admin/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRow = Record<string, string | number | boolean | null | undefined>;

function csvCell(value: ExportRow[string]) {
  const text = value == null ? "" : String(value);
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function makeCsv(headers: string[], rows: ExportRow[]) {
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

async function reportRows(report: string, params: Record<string, string | string[] | undefined>) {
  if (report === "billing") {
    const data = await getBillingReport(params, true);
    return {
      title: "Billing report",
      headers: ["Bill number", "Type", "Client", "Date", "Total", "Paid", "Outstanding", "Status", "Currency"],
      rows: data.rows.map((row) => ({
        "Bill number": row.billNumber,
        Type: row.billType === "NORMAL" ? "Normal Bill" : "Details Bill",
        Client: row.clientName,
        Date: row.billDate.toISOString().slice(0, 10),
        Total: row.totalAmount,
        Paid: row.paidAmount,
        Outstanding: row.outstandingAmount,
        Status: row.status,
        Currency: row.currencyCode,
      })),
    };
  }
  if (report === "financial") {
    const data = await getFinancialReport(params, true);
    return {
      title: "Income and expense report",
      headers: ["Date", "Reference", "Type", "Party", "Category", "Amount", "Currency"],
      rows: data.transactions.map((row) => ({
        Date: row.date.toISOString().slice(0, 10),
        Reference: row.reference,
        Type: row.type,
        Party: row.party,
        Category: row.category,
        Amount: row.amount,
        Currency: row.currencyCode,
      })),
    };
  }
  if (report === "clients") {
    const data = await getClientReport(params, true);
    return {
      title: "Client billing report",
      headers: ["Client", "Status", "Currency", "Billed", "Bill payments", "Receipt vouchers", "Outstanding"],
      rows: data.clients.flatMap((client) => {
        const currencies = new Set([
          ...client.billed.map((item) => item.currencyCode),
          ...client.paid.map((item) => item.currencyCode),
          ...client.receipts.map((item) => item.currencyCode),
          ...client.outstanding.map((item) => item.currencyCode),
        ]);
        if (currencies.size === 0) currencies.add("");
        return [...currencies].map((currencyCode) => ({
          Client: client.displayName,
          Status: client.isActive ? "Active" : "Inactive",
          Currency: currencyCode,
          Billed: client.billed.find((item) => item.currencyCode === currencyCode)?.amount ?? "0.00",
          "Bill payments": client.paid.find((item) => item.currencyCode === currencyCode)?.amount ?? "0.00",
          "Receipt vouchers": client.receipts.find((item) => item.currencyCode === currencyCode)?.amount ?? "0.00",
          Outstanding: client.outstanding.find((item) => item.currencyCode === currencyCode)?.amount ?? "0.00",
        }));
      }),
    };
  }
  if (report === "tax") {
    const data = await getTaxReport(params);
    const rows: ExportRow[] = [
      { Date: "", Task: "Total tax records", Client: "", Status: String(data.taxRecords), Category: "Summary" },
      { Date: "", Task: "Pending compliance tasks", Client: "", Status: String(data.pendingTasks), Category: "Summary" },
      { Date: "", Task: "Completed compliance tasks", Client: "", Status: String(data.completedTasks), Category: "Summary" },
      { Date: "", Task: "Overdue compliance tasks", Client: "", Status: String(data.overdueTasks), Category: "Summary" },
      ...[...data.upcomingDeadlines, ...data.overdueRows].map((task) => ({
        Date: task.dueDate.toISOString().slice(0, 10),
        Task: task.title,
        Client: task.client?.displayName ?? "Company",
        Status: task.dueDate < new Date(new Date().toISOString().slice(0, 10)) ? "Overdue" : task.status,
        Category: task.category,
      })),
    ];
    return { title: "Tax and compliance report", headers: ["Date", "Task", "Client", "Status", "Category"], rows };
  }
  if (report === "overview") {
    const data = await getReportsDashboard(params);
    const rows: ExportRow[] = [];
    for (const item of data.billed) rows.push({ Metric: "Total billed", Amount: item.amount, Currency: item.currencyCode });
    for (const item of data.paymentsReceived) rows.push({ Metric: "Payments received", Amount: item.amount, Currency: item.currencyCode });
    for (const item of data.outstanding) rows.push({ Metric: "Outstanding", Amount: item.amount, Currency: item.currencyCode });
    for (const item of data.financial) {
      rows.push({ Metric: "Income", Amount: item.totalIncome, Currency: item.currencyCode });
      rows.push({ Metric: "Expenses", Amount: item.totalExpenses, Currency: item.currencyCode });
      rows.push({ Metric: "Net balance", Amount: item.netBalance, Currency: item.currencyCode });
    }
    return { title: "Financial summary", headers: ["Metric", "Amount", "Currency"], rows };
  }
  return null;
}

function createPdf(title: string, headers: string[], rows: ExportRow[]) {
  const chunks: Buffer[] = [];
  const document = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 48, left: 44, right: 44 } });
  const ready = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
  document.fillColor("#172B4D").font("Helvetica-Bold").fontSize(18).text(title);
  document.moveDown(0.5).fillColor("#526174").font("Helvetica").fontSize(8)
    .text(`Generated ${new Date().toLocaleString("en-NP", { timeZone: "Asia/Kathmandu" })}`);
  document.moveDown();
  for (const row of rows) {
    const line = headers.map((header) => `${header}: ${row[header] ?? "—"}`).join("   |   ");
    const height = document.heightOfString(line, { width: 505 });
    if (document.y + height + 12 > 745) document.addPage();
    document.fillColor("#263445").font("Helvetica").fontSize(8).text(line, { width: 505 });
    document.moveDown(0.35);
    document.moveTo(44, document.y).lineTo(551, document.y).strokeColor("#E1E5EB").stroke();
    document.moveDown(0.35);
  }
  document.end();
  return ready;
}

export async function GET(request: Request) {
  await requirePermission("REPORTS", "VIEW");
  const url = new URL(request.url);
  const report = url.searchParams.get("report") ?? "";
  const format = url.searchParams.get("format") ?? "csv";
  if (!["overview", "billing", "financial", "clients", "tax"].includes(report) || !["csv", "pdf"].includes(format)) {
    return new Response("Invalid report export request.", { status: 400 });
  }
  const params = Object.fromEntries(url.searchParams.entries());
  const result = await reportRows(report, params);
  if (!result) return new Response("Report not found.", { status: 404 });
  const filename = `global-tax-nepal-${report}-report`;

  if (format === "csv") {
    const content = `\uFEFF${makeCsv(result.headers, result.rows)}`;
    return new Response(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  try {
    const buffer = await createPdf(result.title, result.headers, result.rows);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[admin-reports] PDF export failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return new Response("The report PDF could not be generated.", { status: 500 });
  }
}
