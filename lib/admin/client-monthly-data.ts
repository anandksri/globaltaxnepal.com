import { z } from "zod";

export const nepaliMonths = [
  { key: "baisakh", label: "Baishakh", number: "01" },
  { key: "jestha", label: "Jestha", number: "02" },
  { key: "ashadh", label: "Ashadh", number: "03" },
  { key: "shrawan", label: "Shrawan", number: "04" },
  { key: "bhadra", label: "Bhadra", number: "05" },
  { key: "ashwin", label: "Ashwin", number: "06" },
  { key: "kartik", label: "Kartik", number: "07" },
  { key: "mangsir", label: "Mangsir", number: "08" },
  { key: "poush", label: "Poush", number: "09" },
  { key: "magh", label: "Magh", number: "10" },
  { key: "falgun", label: "Falgun", number: "11" },
  { key: "chaitra", label: "Chaitra", number: "12" },
] as const;

export type MonthKey = (typeof nepaliMonths)[number]["key"];
export type MonthlyDates = Record<MonthKey, string>;

export function parseMonthlyDates(input: unknown) {
  const shape = Object.fromEntries(nepaliMonths.map((month) => [
    month.key,
    z.string().trim().transform((value) => value.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966)))
      .refine((value) => !value || new RegExp(`^\\d{4}-${month.number}-(0[1-9]|[12]\\d|3[0-2])$`).test(value),
        `Enter a ${month.label} BS date as YYYY-${month.number}-DD (day 01–32).`),
  ]));
  const result = z.object(shape).strict().safeParse(input);
  if (!result.success) return { success: false as const, error: result.error.issues[0]?.message ?? "Invalid dates." };
  return { success: true as const, dates: result.data as MonthlyDates };
}
