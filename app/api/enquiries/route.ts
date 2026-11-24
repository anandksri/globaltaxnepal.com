import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  whatsapp: z.string().trim().min(7).max(30),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10).max(5000),
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, message: "The enquiry form could not be read." },
      { status: 400 },
    );
  }

  const parsed = enquirySchema.safeParse({
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email") ?? "",
    subject: formData.get("subject") ?? "",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Please check the required fields and enter a valid email address.",
      },
      { status: 400 },
    );
  }

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  const recipient =
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.ADMIN_2FA_EMAIL?.trim() ||
    "globaltaxnepal@gmail.com";

  if (!smtpUser || !smtpPassword || !smtpFrom) {
    return NextResponse.json(
      {
        success: false,
        message: "Email delivery is not configured yet. Please contact us by phone.",
      },
      { status: 503 },
    );
  }

  const file = formData.get("file");
  const attachment =
    file instanceof File && file.size > 0
      ? [{
          filename: file.name,
          content: Buffer.from(await file.arrayBuffer()),
          contentType: file.type || undefined,
        }]
      : [];

  const safeName = escapeHtml(parsed.data.name);
  const safeWhatsapp = escapeHtml(parsed.data.whatsapp);
  const safeEmail = escapeHtml(parsed.data.email || "Not provided");
  const safeSubject = escapeHtml(parsed.data.subject || "Website enquiry");
  const safeMessage = escapeHtml(parsed.data.message).replaceAll("\n", "<br>");

  try {
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });

    await transport.sendMail({
      from: smtpFrom,
      to: recipient,
      replyTo: parsed.data.email || undefined,
      subject: `Website enquiry: ${parsed.data.subject || parsed.data.name}`,
      text: [
        "New website enquiry",
        "",
        `Name: ${parsed.data.name}`,
        `Mobile / WhatsApp: ${parsed.data.whatsapp}`,
        `Email: ${parsed.data.email || "Not provided"}`,
        `Subject: ${parsed.data.subject || "Website enquiry"}`,
        "",
        parsed.data.message,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;color:#263445">
          <h2 style="color:#172b4d">New website enquiry</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Mobile / WhatsApp:</strong> ${safeWhatsapp}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <hr style="border:0;border-top:1px solid #e1e5eb">
          <p>${safeMessage}</p>
        </div>
      `,
      attachments: attachment,
    });

    return NextResponse.json({
      success: true,
      message: "Thank you. Your enquiry has been sent to Global Tax Nepal.",
    });
  } catch (error) {
    console.error("[public-enquiry] Email delivery failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
      code:
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        message: "The enquiry could not be sent right now. Please try WhatsApp or call us.",
      },
      { status: 502 },
    );
  }
}
