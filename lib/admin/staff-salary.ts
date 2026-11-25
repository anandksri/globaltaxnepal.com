import { z } from "zod";
import { nepaliMonths } from "./client-monthly-data";

export function parseSalaryYear(input: unknown) {
  return z.string().regex(/^[2-9]\d{3}$/).transform(Number).safeParse(input);
}

export function parseSalaryAmounts(input: unknown) {
  const amount = z.string().trim()
    .transform((value) => value.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966)))
    .refine((value) => !value || /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value),
      "Enter a non-negative amount with up to 10 digits and 2 decimal places.");
  const shape = Object.fromEntries(nepaliMonths.map((month) => [month.key, amount]));
  const result = z.object(shape).strict().safeParse(input);
  if (!result.success) return { success: false as const, error: result.error.issues[0]?.message ?? "Invalid amounts." };
  return { success: true as const, amounts: result.data as Record<(typeof nepaliMonths)[number]["key"], string> };
}

export function emptySalaryAmounts() {
  return Object.fromEntries(nepaliMonths.map((month) => [month.key, ""]));
}
