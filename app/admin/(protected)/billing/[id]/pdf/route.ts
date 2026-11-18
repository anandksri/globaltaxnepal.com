import { readFile } from "node:fs/promises";
import path from "node:path";
import { BillStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import { requireAdmin } from "@/lib/admin/auth";
import { amountInWords, formatCurrency, moneyToCents } from "@/lib/admin/billing";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function printableDate(value: Date | null) {
  return value?.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "UTC" }) ?? "—";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const parsedId = z.string().min(1).max(191).safeParse(id);
  if (!parsedId.success) return new Response("Not found", { status: 404 });

  const [bill, company] = await Promise.all([
    prisma.bill.findUnique({
      where: { id: parsedId.data },
      include: {
        items: { orderBy: { position: "asc" } },
        payments: {
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
          include: { receivedBy: { select: { name: true, email: true } } },
        },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "company" } }),
  ]);
  if (!bill) return new Response("Not found", { status: 404 });

  let logo: string;
  try {
    logo = await readFile(
      path.join(process.cwd(), "public", "assets", "global-tax-nepal-logo.svg"),
      "utf8",
    );
  } catch (error) {
    console.error("[admin-billing] Invoice logo could not be loaded.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return new Response("Invoice PDF could not be generated.", { status: 500 });
  }

  const chunks: Buffer[] = [];
  const document = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 48, left: 48, right: 48 } });
  const pdfReady = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  const left = 48;
  const right = 547;
  const currency = bill.currencyCode;
  const paid = bill.payments.reduce((sum, payment) => sum + moneyToCents(payment.amount.toFixed(2)), 0n);
  const total = moneyToCents(bill.totalAmount.toFixed(2));
  const vatStatus = bill.status === BillStatus.CANCELLED ? "CANCELLED" : bill.status.replaceAll("_", " ");

  document.fillColor("#172B4D").font("Helvetica-Bold").fontSize(18).text(company?.name || "Global Tax Nepal", left, 48, { width: 300 });
  document.fillColor("#526174").font("Helvetica").fontSize(9);
  let companyY = 76;
  for (const line of [company?.address, company?.phone, company?.email, company?.website]) {
    if (line) {
      document.text(line, left, companyY, { width: 280 });
      companyY += 13;
    }
  }
  SVGtoPDF(document, logo, 355, 45, { width: 190, height: 33 });
  document.fillColor("#167D78").font("Helvetica-Bold").fontSize(18).text("INVOICE", 355, 83, { width: 190, align: "right" });
  document.fillColor("#172B4D").font("Helvetica-Bold").fontSize(11).text(bill.billNumber, 355, 106, { width: 190, align: "right" });
  document.fillColor("#526174").font("Helvetica").fontSize(9).text(vatStatus, 355, 122, { width: 190, align: "right" });
  document.moveTo(left, 150).lineTo(right, 150).strokeColor("#E1E5EB").stroke();

  let y = 168;
  document.fillColor("#526174").font("Helvetica-Bold").fontSize(8).text("BILL TO", left, y);
  document.text("BILL DETAILS", 365, y);
  y += 16;
  document.fillColor("#172B4D").font("Helvetica-Bold").fontSize(11).text(bill.clientName, left, y, { width: 280 });
  document.fillColor("#263445").font("Helvetica").fontSize(9);
  document.text(`Bill date: ${printableDate(bill.billDate)}`, 365, y, { width: 180 });
  document.text(`Due date: ${printableDate(bill.dueDate)}`, 365, y + 14, { width: 180 });
  y += 17;
  for (const line of [
    bill.contactPerson,
    bill.clientAddress,
    bill.clientPhone,
    bill.clientEmail,
    bill.clientPanNumber ? `PAN: ${bill.clientPanNumber}` : null,
    bill.clientVatNumber ? `VAT: ${bill.clientVatNumber}` : null,
  ]) {
    if (line) {
      document.fillColor("#526174").font("Helvetica").fontSize(9).text(line, left, y, { width: 280 });
      y += 13;
    }
  }
  y = Math.max(y + 14, 258);

  const columns = { description: left, quantity: 355, rate: 430, amount: 490 };
  document.rect(left, y, right - left, 24).fill("#F4F5F8");
  document.fillColor("#526174").font("Helvetica-Bold").fontSize(8);
  document.text("DESCRIPTION", columns.description + 8, y + 8);
  document.text("QTY", columns.quantity, y + 8, { width: 55, align: "right" });
  document.text("RATE", columns.rate, y + 8, { width: 60, align: "right" });
  document.text("AMOUNT", columns.amount, y + 8, { width: 49, align: "right" });
  y += 30;

  for (const item of bill.items) {
    const descriptionHeight = document.heightOfString(item.description, { width: 275 });
    if (y + Math.max(descriptionHeight, 16) > 745) {
      document.addPage();
      y = 55;
    }
    document.fillColor("#263445").font("Helvetica").fontSize(9);
    document.text(item.description, columns.description + 4, y, { width: 275 });
    document.text(`${item.quantity.toString()} ${item.unit}`, columns.quantity, y, { width: 55, align: "right" });
    document.text(formatCurrency(moneyToCents(item.rate.toFixed(2)), currency), columns.rate, y, { width: 60, align: "right" });
    document.text(formatCurrency(moneyToCents(item.amount.toFixed(2)), currency), columns.amount - 10, y, { width: 59, align: "right" });
    y += Math.max(descriptionHeight, 16) + 10;
    document.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor("#E1E5EB").stroke();
  }

  if (y > 615) {
    document.addPage();
    y = 55;
  } else {
    y += 12;
  }
  const totalsX = 337;
  const addTotal = (label: string, value: string, bold = false) => {
    document.fillColor(bold ? "#172B4D" : "#526174")
      .font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 10 : 9);
    document.text(label, totalsX, y, { width: 105 });
    document.text(value, totalsX + 105, y, { width: 105, align: "right" });
    y += 17;
  };
  addTotal("Subtotal", formatCurrency(moneyToCents(bill.subtotal.toFixed(2)), currency));
  addTotal("Discount", formatCurrency(moneyToCents(bill.discount.toFixed(2)), currency));
  addTotal("Taxable amount", formatCurrency(moneyToCents(bill.taxableAmount.toFixed(2)), currency));
  addTotal(`VAT ${bill.vatApplied ? `(${bill.vatRate.toFixed(2)}%)` : "(not applied)"}`, formatCurrency(moneyToCents(bill.vatAmount.toFixed(2)), currency));
  addTotal("Grand total", formatCurrency(total, currency), true);
  addTotal("Amount paid", formatCurrency(paid, currency));
  addTotal("Balance due", formatCurrency(total - paid, currency), true);
  y += 7;
  document.fillColor("#526174").font("Helvetica-Oblique").fontSize(8).text(amountInWords(total), totalsX, y, { width: 210, align: "right" });
  y += 32;

  if (bill.notes) {
    document.fillColor("#526174").font("Helvetica-Bold").fontSize(8).text("NOTES", left, y);
    y += 13;
    document.fillColor("#263445").font("Helvetica").fontSize(9).text(bill.notes, left, y, { width: right - left });
    y += document.heightOfString(bill.notes, { width: right - left }) + 18;
  }
  if (company?.paymentInstructions) {
    document.fillColor("#526174").font("Helvetica-Bold").fontSize(8).text("PAYMENT INSTRUCTIONS", left, y);
    y += 13;
    document.fillColor("#263445").font("Helvetica").fontSize(9).text(company.paymentInstructions, left, y, { width: right - left });
  }
  document.moveTo(368, 770).lineTo(right, 770).strokeColor("#263445").stroke();
  document.fillColor("#526174").font("Helvetica").fontSize(8).text("Authorized signature", 368, 777, { width: right - 368, align: "center" });

  document.end();
  try {
    const buffer = await pdfReady;
    const filename = `${bill.billNumber.replace(/[^A-Za-z0-9._-]/g, "-")}.pdf`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[admin-billing] PDF generation failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return new Response("Invoice PDF could not be generated.", { status: 500 });
  }
}
