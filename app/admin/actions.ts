"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import {
  clearAdminSession,
  clearPendingTwoFactorSession,
  createPendingTwoFactorSession,
  generateTwoFactorCode,
  getPendingTwoFactorSession,
  verifyTwoFactorCode,
} from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

export type VerifyTwoFactorState = {
  error?: string;
  success?: string;
};

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

export async function loginAdmin(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email address and password." };
  }

  let user: {
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
  } | null;
  let passwordMatches: boolean;

  try {
    user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
      },
    });

    passwordMatches = user
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : false;
  } catch (error) {
    console.error("[admin-auth] Sign-in account lookup failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      error: "Sign-in is temporarily unavailable. Please try again later.",
    };
  }

  if (!user || !passwordMatches || !user.isActive) {
    return { error: "The email or password is incorrect." };
  }

  const code = generateTwoFactorCode();
  try {
    await sendAdminTwoFactorCode(process.env.ADMIN_2FA_EMAIL?.trim() || user.email, code);
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;
    console.error("[admin-auth] Verification email delivery failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: errorCode,
    });
    if (error instanceof Error && error.message.startsWith("Email configuration")) {
      return { error: error.message };
    }
    return {
      error: "The verification email could not be sent. Please try again later.",
    };
  }

  try {
    await createPendingTwoFactorSession(user.id, code);
  } catch (error) {
    console.error("[admin-auth] Pending verification session could not be created.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      error: "Sign-in is temporarily unavailable. Please try again later.",
    };
  }

  redirect("/admin/verify");
}

async function sendAdminTwoFactorCode(email: string, code: string) {
  const deliveryMode = process.env.EMAIL_DELIVERY_MODE || "smtp";

  if (deliveryMode === "console") {
    console.info(`[admin-2fa] Development OTP for ${email}: ${code}`);
    return;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || user;

  if (!user || !password || !from) {
    throw new Error("Email configuration is missing. Set SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });

  await transport.sendMail({
    from,
    to: email,
    subject: "Your Global Tax Nepal admin verification code",
    text: `Your admin verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your admin verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
}

export async function verifyAdminTwoFactor(
  _previousState: VerifyTwoFactorState,
  formData: FormData,
): Promise<VerifyTwoFactorState> {
  const parsed = z.object({
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code."),
  }).safeParse({ code: formData.get("code") });

  if (!parsed.success) {
    return { error: "Enter the 6-digit verification code." };
  }

  const result = await verifyTwoFactorCode(parsed.data.code);

  if (result.status === "verified") {
    redirect("/admin");
  }
  if (result.status === "expired") {
    return { error: "Your verification code expired. Sign in again." };
  }
  if (result.status === "too-many-attempts") {
    return { error: "Too many incorrect attempts. Sign in again." };
  }

  return {
    error: `Incorrect verification code. ${result.remainingAttempts} attempt${result.remainingAttempts === 1 ? "" : "s"} remaining.`,
  };
}

export async function resendAdminTwoFactor(
  _previousState: VerifyTwoFactorState,
): Promise<VerifyTwoFactorState> {
  const pending = await getPendingTwoFactorSession();
  if (!pending) {
    return { error: "Your verification session expired. Sign in again." };
  }

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: { id: true, email: true, isActive: true },
  });
  if (!user || !user.isActive) {
    await clearPendingTwoFactorSession();
    return { error: "This account is no longer available. Sign in again." };
  }

  try {
    const code = generateTwoFactorCode();
    await sendAdminTwoFactorCode(process.env.ADMIN_2FA_EMAIL?.trim() || user.email, code);
    await createPendingTwoFactorSession(user.id, code);
  } catch (error) {
    return {
      error: error instanceof Error
        ? error.message
        : "The verification email could not be sent.",
    };
  }

  return { success: "A new verification code was sent." };
}

export async function logoutAdmin() {
  await clearAdminSession();
  await clearPendingTwoFactorSession();
  redirect("/admin/login");
}
