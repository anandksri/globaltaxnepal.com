import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  errors as joseErrors,
  jwtVerify,
  SignJWT,
} from "jose";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "gtn_admin_session";
const sessionLifetimeSeconds = 60 * 60 * 8;
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
      role: { select: { name: true } },
    },
  });

  if (!user || !user.isActive || user.role.name !== "ADMIN") {
    return null;
  }

  return { id: user.id, name: user.name, email: user.email };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}
