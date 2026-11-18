"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
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

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        role: { select: { name: true } },
      },
    });

    const passwordMatches = user
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : false;

    if (
      !user ||
      !passwordMatches ||
      !user.isActive ||
      user.role.name !== "ADMIN"
    ) {
      return { error: "The email or password is incorrect." };
    }

    await createAdminSession(user.id);
  } catch (error) {
    console.error("[admin-auth] Sign-in could not be completed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      error: "Admin sign-in is temporarily unavailable. Please try again later.",
    };
  }

  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin/login");
}
