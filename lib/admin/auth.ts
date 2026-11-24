import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  errors as joseErrors,
  jwtVerify,
  SignJWT,
} from "jose";
import { AdminModule, PermissionAction } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "gtn_admin_session";
const pendingTwoFactorCookieName = "gtn_admin_2fa";
const sessionLifetimeSeconds = 60 * 60 * 8;
const pendingTwoFactorLifetimeSeconds = 10 * 60;
const maximumTwoFactorAttempts = 5;
const sessionIssuer = "globaltaxnepal";
const sessionAudience = "globaltaxnepal-admin";

function getSessionKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export type AdminIdentity = {
  id: string;
  name: string | null;
  email: string;
  roleName: string;
  permissions: Array<{ module: AdminModule; action: PermissionAction }>;
};

export async function createAdminSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(sessionIssuer)
    .setAudience(sessionAudience)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${sessionLifetimeSeconds}s`)
    .sign(getSessionKey());

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    maxAge: sessionLifetimeSeconds,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function getTwoFactorCodeHash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function generateTwoFactorCode() {
  return randomInt(100000, 1000000).toString();
}

export async function createPendingTwoFactorSession(
  userId: string,
  code: string,
) {
  const token = await new SignJWT({
    otpHash: getTwoFactorCodeHash(code),
    attempts: 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(sessionIssuer)
    .setAudience(`${sessionAudience}-2fa`)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${pendingTwoFactorLifetimeSeconds}s`)
    .sign(getSessionKey());

  const cookieStore = await cookies();
  cookieStore.set(pendingTwoFactorCookieName, token, {
    httpOnly: true,
    maxAge: pendingTwoFactorLifetimeSeconds,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getPendingTwoFactorSession() {
  const token = (await cookies()).get(pendingTwoFactorCookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ["HS256"],
      audience: `${sessionAudience}-2fa`,
      issuer: sessionIssuer,
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.otpHash !== "string" ||
      typeof payload.attempts !== "number"
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      otpHash: payload.otpHash,
      attempts: payload.attempts,
    };
  } catch {
    return null;
  }
}

export async function verifyTwoFactorCode(code: string) {
  const pending = await getPendingTwoFactorSession();
  if (!pending) return { status: "expired" as const };
  if (pending.attempts >= maximumTwoFactorAttempts) {
    await clearPendingTwoFactorSession();
    return { status: "too-many-attempts" as const };
  }

  const suppliedHash = getTwoFactorCodeHash(code);
  const suppliedBuffer = Buffer.from(suppliedHash, "hex");
  const storedBuffer = Buffer.from(pending.otpHash, "hex");
  const matches =
    suppliedBuffer.length === storedBuffer.length &&
    timingSafeEqual(suppliedBuffer, storedBuffer);

  if (!matches) {
    const nextAttempts = pending.attempts + 1;
    if (nextAttempts >= maximumTwoFactorAttempts) {
      await clearPendingTwoFactorSession();
      return { status: "too-many-attempts" as const };
    }

    const token = await new SignJWT({
      otpHash: pending.otpHash,
      attempts: nextAttempts,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(sessionIssuer)
      .setAudience(`${sessionAudience}-2fa`)
      .setSubject(pending.userId)
      .setIssuedAt()
      .setExpirationTime(`${pendingTwoFactorLifetimeSeconds}s`)
      .sign(getSessionKey());

    (await cookies()).set(pendingTwoFactorCookieName, token, {
      httpOnly: true,
      maxAge: pendingTwoFactorLifetimeSeconds,
      path: "/admin",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return {
      status: "incorrect" as const,
      remainingAttempts: maximumTwoFactorAttempts - nextAttempts,
    };
  }

  await clearPendingTwoFactorSession();
  await createAdminSession(pending.userId);
  return { status: "verified" as const };
}

export async function clearPendingTwoFactorSession() {
  (await cookies()).set(pendingTwoFactorCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ["HS256"],
      audience: sessionAudience,
      issuer: sessionIssuer,
    });

    if (typeof payload.sub !== "string") {
      return null;
    }
    userId = payload.sub;
  } catch (error) {
    if (
      error instanceof joseErrors.JWTExpired ||
      error instanceof joseErrors.JWTInvalid ||
      error instanceof joseErrors.JWSInvalid ||
      error instanceof joseErrors.JWSSignatureVerificationFailed ||
      error instanceof joseErrors.JWTClaimValidationFailed
    ) {
      return null;
    }

    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      phone: true,
      role: {
        select: {
          name: true,
          permissions: { select: { module: true, action: true } },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleName: user.role.name,
    permissions: user.role.permissions,
  };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function requirePermission(
  module: AdminModule,
  action: PermissionAction = PermissionAction.VIEW,
) {
  const admin = await requireAdmin();
  if (admin.roleName !== "SUPER_ADMIN" && !admin.permissions.some((permission) =>
    permission.module === module && permission.action === action
  )) {
    redirect("/admin/forbidden");
  }
  return admin;
}

export async function requireSuperAdmin() {
  const admin = await requireAdmin();
  if (admin.roleName !== "SUPER_ADMIN") notFound();
  return admin;
}
