"use server";

import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type PasswordResetState = { error?: string; success?: string };

const genericMessage = "If an active account exists for that email, a reset link will be sent. Please check your inbox and spam folder.";
const invalidLink = "This reset link is invalid, expired, or has already been used.";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashCredentials(email: string, passwordHash: string) {
  return createHash("sha256").update(JSON.stringify([email, passwordHash])).digest("hex");
}

export async function requestPasswordReset(
  _state: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const email = z.string().trim().email().max(254).safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };

  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || smtpUser;
  let origin: URL;
  try {
    origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || "");
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash ||
      (process.env.NODE_ENV === "production" && origin.protocol !== "https:")) throw new Error("Invalid origin");
  } catch {
    console.error("[admin-reset] NEXT_PUBLIC_SITE_URL must be a valid public origin.");
    return { error: "Password reset is temporarily unavailable. Please contact an administrator." };
  }
  if (!smtpUser || !smtpPassword || !from) {
    console.error("[admin-reset] SMTP configuration is missing.");
    return { error: "Password reset is temporarily unavailable. Please contact an administrator." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.data.toLowerCase() },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });
    if (!user || !user.isActive) return { success: genericMessage };

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const now = new Date();
    const data = {
      tokenHash,
      credentialHash: hashCredentials(user.email, user.passwordHash),
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    };
    const updated = await prisma.adminPasswordReset.updateMany({
      where: { userId: user.id, createdAt: { lte: new Date(now.getTime() - 60 * 1000) } },
      data,
    });
    if (!updated.count) {
      try {
        await prisma.adminPasswordReset.create({ data: { userId: user.id, ...data } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return { success: genericMessage };
        }
        throw error;
      }
    }

    const resetUrl = new URL(`/admin/reset-password/${token}`, origin).toString();
    const port = Number(process.env.SMTP_PORT || "587");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    try {
      await transport.sendMail({
        from,
        to: user.email,
        subject: "Reset your Global Tax Nepal password",
        text: `Use this one-time link to reset your password:\n${resetUrl}\n\nThe link expires in 30 minutes. If you did not request this, ignore this email.`,
      });
    } catch (error) {
      await prisma.adminPasswordReset.deleteMany({ where: { userId: user.id, tokenHash } });
      console.error("[admin-reset] Reset email delivery failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    }
    return { success: genericMessage };
  } catch (error) {
    console.error("[admin-reset] Reset request failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Password reset is temporarily unavailable. Please try again later." };
  }
}

export async function resetPassword(
  token: string,
  _state: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  if (!tokenPattern.test(token)) return { error: invalidLink };
  const parsed = z.object({
    password: z.string().min(11, "Use at least 11 characters.").max(72)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password exceeds 72 UTF-8 bytes."),
    confirmPassword: z.string(),
  }).refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"], message: "Passwords do not match.",
  }).safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a valid password." };

  try {
    const tokenHash = hashToken(token);
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const changed = await prisma.$transaction(async (transaction) => {
      const reset = await transaction.adminPasswordReset.findUnique({ where: { tokenHash } });
      if (!reset) return false;
      const user = await transaction.user.findUnique({
        where: { id: reset.userId },
        select: { email: true, passwordHash: true, isActive: true },
      });
      if (!user || !user.isActive || hashCredentials(user.email, user.passwordHash) !== reset.credentialHash) return false;
      const claimed = await transaction.adminPasswordReset.deleteMany({
        where: { userId: reset.userId, tokenHash, expiresAt: { gt: new Date() }, user: { isActive: true } },
      });
      if (claimed.count !== 1) return false;
      const updated = await transaction.user.updateMany({
        where: { id: reset.userId, isActive: true, email: user.email, passwordHash: user.passwordHash },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error("RESET_ACCOUNT_CHANGED");
      await transaction.adminTwoFactorChallenge.deleteMany({ where: { userId: reset.userId } });
      await transaction.userInvitation.deleteMany({ where: { userId: reset.userId, usedAt: null } });
      return true;
    });
    return changed ? { success: "Password reset. You can now sign in with your new password." } : { error: invalidLink };
  } catch (error) {
    console.error("[admin-reset] Password reset failed.", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: "Your password could not be reset. Please try again later." };
  }
}
