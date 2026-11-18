import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const setupSchema = z.object({
  ADMIN_EMAIL: z.string().trim().email().max(254),
  ADMIN_PASSWORD: z
    .string()
    .min(12)
    .max(72)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
  ADMIN_NAME: z.string().trim().min(1).max(100).optional(),
});

const setup = setupSchema.safeParse({
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_NAME: process.env.ADMIN_NAME || undefined,
});

if (!setup.success) {
  console.error(
    "Admin setup requires a valid ADMIN_EMAIL, an ADMIN_PASSWORD of 12–72 characters (at most 72 UTF-8 bytes), and an optional ADMIN_NAME.",
  );
  process.exitCode = 1;
} else {
  const prisma = new PrismaClient();

  try {
    const email = setup.data.ADMIN_EMAIL.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new Error(
        "An account with ADMIN_EMAIL already exists. No account or password was changed.",
      );
    }

    const passwordHash = await bcrypt.hash(setup.data.ADMIN_PASSWORD, 12);

    await prisma.$transaction(async (transaction) => {
      const role = await transaction.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: {
          name: "ADMIN",
          description: "Authorized administrator",
        },
      });

      await transaction.user.create({
        data: {
          name: setup.data.ADMIN_NAME,
          email,
          passwordHash,
          roleId: role.id,
        },
      });
    });

    console.info("Administrator account created.");
  } finally {
    await prisma.$disconnect();
  }
}
