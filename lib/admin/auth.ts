import "server-only";

import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
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
const rememberedSessionLifetimeSeconds = 60 * 60 * 24 * 30;
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

export async function createAdminSession(userId: string, rememberMe = false, sessionVersion = 0) {
  const lifetimeSeconds = rememberMe
    ? rememberedSessionLifetimeSeconds
    : sessionLifetimeSeconds;
  const token = await new SignJWT({ sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(sessionIssuer)
    .setAudience(sessionAudience)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${lifetimeSeconds}s`)
    .sign(getSessionKey());

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    maxAge: lifetimeSeconds,
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
  rememberMe = false,
  sessionVersion = 0,
) {
  const id = randomUUID();
  const challengeData = {
    codeHash: getTwoFactorCodeHash(code),
    attempts: 0,
    rememberMe,
    expiresAt: new Date(Date.now() + pendingTwoFactorLifetimeSeconds * 1000),
  };
  const challenge = await prisma.adminTwoFactorChallenge.upsert({
    where: { userId },
    update: { id, ...challengeData },
    create: { id, userId, ...challengeData },
    select: { id: true },
  });
  const token = await new SignJWT({ challengeId: challenge.id, sessionVersion })
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

    if (typeof payload.challengeId !== "string" ||
      (payload.sessionVersion !== undefined && typeof payload.sessionVersion !== "number")) {
      return null;
    }

    const challenge = await prisma.adminTwoFactorChallenge.findUnique({
      where: { id: payload.challengeId },
      select: {
        id: true,
        userId: true,
        codeHash: true,
        attempts: true,
        rememberMe: true,
        expiresAt: true,
      },
    });
    if (!challenge || challenge.expiresAt <= new Date()) return null;
    return { challengeId: challenge.id, ...challenge, sessionVersion: payload.sessionVersion ?? 0 };
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
  const storedBuffer = Buffer.from(pending.codeHash, "hex");
  const matches =
    suppliedBuffer.length === storedBuffer.length &&
    timingSafeEqual(suppliedBuffer, storedBuffer);

  if (!matches) {
    const nextAttempts = pending.attempts + 1;
    const updated = await prisma.adminTwoFactorChallenge.updateMany({
      where: {
        id: pending.challengeId,
        attempts: pending.attempts,
        expiresAt: { gt: new Date() },
      },
      data: { attempts: nextAttempts },
    });
    if (updated.count !== 1) return { status: "expired" as const };

    if (nextAttempts >= maximumTwoFactorAttempts) {
      await prisma.adminTwoFactorChallenge.deleteMany({
        where: { id: pending.challengeId },
      });
      await clearPendingTwoFactorSession();
      return { status: "too-many-attempts" as const };
    }

    return {
      status: "incorrect" as const,
      remainingAttempts: maximumTwoFactorAttempts - nextAttempts,
    };
  }

  const consumed = await prisma.adminTwoFactorChallenge.deleteMany({
    where: {
      id: pending.challengeId,
      expiresAt: { gt: new Date() },
    },
  });
  if (consumed.count !== 1) return { status: "expired" as const };
  await clearPendingTwoFactorSession();
  await createAdminSession(pending.userId, pending.rememberMe, pending.sessionVersion);
  return { status: "verified" as const };
}

export async function clearPendingTwoFactorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(pendingTwoFactorCookieName)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSessionKey(), {
        algorithms: ["HS256"],
        audience: `${sessionAudience}-2fa`,
        issuer: sessionIssuer,
      });
      if (typeof payload.challengeId === "string") {
        await prisma.adminTwoFactorChallenge.deleteMany({
          where: { id: payload.challengeId },
        });
      }
    } catch {
      // An invalid or expired cookie is still cleared below.
    }
  }
  cookieStore.set(pendingTwoFactorCookieName, "", {
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
  let sessionVersion: number;
  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ["HS256"],
      audience: sessionAudience,
      issuer: sessionIssuer,
    });

    if (typeof payload.sub !== "string") {
      return null;
    }
    if (payload.sessionVersion !== undefined && typeof payload.sessionVersion !== "number") return null;
    userId = payload.sub;
    sessionVersion = payload.sessionVersion ?? 0;
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
      sessionVersion: true,
      phone: true,
      role: {
        select: {
          name: true,
          permissions: { select: { module: true, action: true } },
        },
      },
    },
  });

  if (!user || !user.isActive || user.sessionVersion !== sessionVersion) {
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
