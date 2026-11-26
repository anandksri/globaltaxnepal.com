import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const maxAttachmentSize = 3 * 1024 * 1024;

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

  const file = formData.get("file");
  const uploadedFile = file instanceof File && file.size > 0 ? file : null;
  if (uploadedFile && (uploadedFile.size > maxAttachmentSize || uploadedFile.name.length > 255 || uploadedFile.type.length > 255)) {
    return NextResponse.json(
      { success: false, message: "The attachment must be no larger than 3 MB and have a filename under 256 characters." },
      { status: 400 },
    );
  }

  let enquiryId: string;
  let attachmentData: Buffer | null = null;
  try {
    attachmentData = uploadedFile ? Buffer.from(await uploadedFile.arrayBuffer()) : null;
    const enquiry = await prisma.websiteEnquiry.create({
      data: {
        name: parsed.data.name,
        whatsapp: parsed.data.whatsapp,
        email: parsed.data.email || null,
        subject: parsed.data.subject || null,
        message: parsed.data.message,
        attachmentName: uploadedFile?.name || null,
        attachmentType: uploadedFile?.type || null,
        attachmentData: attachmentData ? new Uint8Array(attachmentData) : null,
      },
      select: { id: true },
    });
    enquiryId = enquiry.id;
  } catch (error) {
    console.error("[public-enquiry] Enquiry could not be saved.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, message: "The enquiry could not be submitted right now. Please try WhatsApp or call us." },
      { status: 503 },
    );
  }

  const safeName = escapeHtml(parsed.data.name);
  const safeWhatsapp = escapeHtml(parsed.data.whatsapp);
  const safeEmail = escapeHtml(parsed.data.email || "Not provided");
  const safeSubject = escapeHtml(parsed.data.subject || "Website enquiry");
  const safeMessage = escapeHtml(parsed.data.message).replaceAll("\n", "<br>");

  let emailSent = false;
  try {
    if (!smtpUser || !smtpPassword || !smtpFrom) throw new Error("Email delivery is not configured.");
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
      attachments: uploadedFile && attachmentData ? [{
        filename: uploadedFile.name,
        content: attachmentData,
        contentType: uploadedFile.type || undefined,
      }] : [],
    });
    emailSent = true;
  } catch (error) {
    console.error("[public-enquiry] Email delivery failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
      code:
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : undefined,
    });
  }

  try {
    await prisma.websiteEnquiry.update({
      where: { id: enquiryId },
      data: { emailStatus: emailSent ? "SENT" : "FAILED" },
    });
  } catch (error) {
    console.error("[public-enquiry] Email status could not be saved.", {
      enquiryId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
  return NextResponse.json({
    success: true,
    message: emailSent
      ? "Thank you. Your enquiry has been sent to Global Tax Nepal."
      : "Your enquiry was received, but the email notification could not be sent. Our team can still see it in the dashboard.",
  });
}
