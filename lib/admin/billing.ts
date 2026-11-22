import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const quantityPattern = /^\d{1,9}(?:\.\d{1,3})?$/;
const moneyPattern = /^\d{1,12}(?:\.\d{1,2})?$/;
const ratePattern = /^\d{1,3}(?:\.\d{1,2})?$/;

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const billItemSchema = z.object({
  description: z.string().trim().min(1, "Enter a service description.").max(500),
  quantity: z.string().trim().regex(quantityPattern, "Enter a quantity with up to 3 decimal places."),
  unit: z.string().trim().min(1, "Enter a unit.").max(30),
  rate: z.string().trim().regex(moneyPattern, "Enter a valid rate with up to 2 decimal places."),
});

export const billInputSchema = z.object({
  clientId: z.string().trim().min(1, "Select a client."),
  customBillNumber: z.string().trim().max(40, "Bill number must be 40 characters or fewer."),
  billDate: z.string().refine(isValidDate, "Enter a valid bill date."),
  dueDate: z.union([z.literal(""), z.string().refine(isValidDate, "Enter a valid due date.")]),
  discount: z.string().trim().regex(moneyPattern, "Enter a valid discount."),
  vatApplied: z.boolean(),
  vatRate: z.string().trim().regex(ratePattern, "Enter a valid VAT percentage."),
  notes: z.string().trim().max(5000, "Notes must be 5,000 characters or fewer."),
  items: z.array(billItemSchema).min(1, "Add at least one bill item.").max(100),
}).superRefine((bill, context) => {
  if (bill.dueDate && billDateIsLater(bill.billDate, bill.dueDate)) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "Due date cannot be before the bill date." });
  }
  if (ratePattern.test(bill.vatRate)) {
    const rate = decimalToMinorUnits(bill.vatRate, 100n);
    if (rate > 10_000n) {
      context.addIssue({ code: "custom", path: ["vatRate"], message: "VAT percentage cannot exceed 100%." });
    }
    if (bill.vatApplied && rate === 0n) {
      context.addIssue({ code: "custom", path: ["vatRate"], message: "Enter a VAT percentage greater than zero." });
    }
  }
});

export type BillInput = z.infer<typeof billInputSchema>;

export function parseBillFormData(formData: FormData) {
  const items: unknown[] = [];
  const descriptions = formData.getAll("itemDescription");
  const quantities = formData.getAll("itemQuantity");
  const units = formData.getAll("itemUnit");
  const rates = formData.getAll("itemRate");

  if (
    descriptions.length !== quantities.length ||
    descriptions.length !== units.length ||
    descriptions.length !== rates.length
  ) {
    return billInputSchema.safeParse({
      clientId: "",
      customBillNumber: "",
      billDate: "",
      dueDate: "",
      discount: "",
      vatApplied: false,
      vatRate: "",
      notes: "",
      items: [],
    });
  }

  for (let index = 0; index < descriptions.length; index += 1) {
    items.push({
      description: descriptions[index],
      quantity: quantities[index],
      unit: units[index],
      rate: rates[index],
    });
  }

  return billInputSchema.safeParse({
    clientId: formData.get("clientId"),
    customBillNumber: formData.get("customBillNumber") ?? "",
    billDate: formData.get("billDate"),
    dueDate: formData.get("dueDate") ?? "",
    discount: formData.get("discount") ?? "0",
    vatApplied: formData.get("vatApplied") === "on",
    vatRate: formData.get("vatRate") ?? "0",
    notes: formData.get("notes") ?? "",
    items,
  });
}

function billDateIsLater(first: string, second: string) {
  return first > second;
}

function decimalToMinorUnits(value: string, multiplier: bigint) {
  const [whole, fraction = ""] = value.split(".");
  const fractionDigits = multiplier === 1000n ? 3 : 2;
  return BigInt(whole) * multiplier + BigInt(fraction.padEnd(fractionDigits, "0"));
}

export function quantityToMilliunits(value: string) {
  return decimalToMinorUnits(value, 1000n);
}

export function moneyToCents(value: string) {
  return decimalToMinorUnits(value, 100n);
}

export function percentageToBasisPoints(value: string) {
  return decimalToMinorUnits(value, 100n);
}

export function formatMilliunits(value: bigint) {
  return formatScaledInteger(value, 3);
}

export function formatCents(value: bigint) {
  return formatScaledInteger(value, 2);
}

function formatScaledInteger(value: bigint, decimals: number) {
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function calculateBill(input: Pick<BillInput, "items" | "discount" | "vatApplied" | "vatRate">) {
  const itemAmounts = input.items.map((item) => {
    const unrounded = quantityToMilliunits(item.quantity) * moneyToCents(item.rate);
    const amount = (unrounded + 500n) / 1000n;
    return {
      amount,
      amountDecimal: formatCents(amount),
    };
  });

  const subtotal = itemAmounts.reduce((total, item) => total + item.amount, 0n);
  const discount = moneyToCents(input.discount);
  if (discount > subtotal) {
    throw new RangeError("Discount cannot exceed the subtotal.");
  }

  const taxableAmount = subtotal - discount;
  const vatRate = input.vatApplied ? percentageToBasisPoints(input.vatRate) : 0n;
  const vatAmount = (taxableAmount * vatRate + 5000n) / 10_000n;

  return {
    itemAmounts,
    subtotal,
    discount,
    taxableAmount,
    vatRate,
    vatAmount,
    totalAmount: taxableAmount + vatAmount,
  };
}

export function formatCurrency(cents: bigint, currencyCode: string) {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  const groupedWhole = new Intl.NumberFormat("en-US").format(Number(whole));
  return `${currencyCode} ${groupedWhole}.${fraction}`;
}

const smallNumbers = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function wordsBelowThousand(value: number): string {
  const parts: string[] = [];
  if (value >= 100) {
    parts.push(`${smallNumbers[Math.floor(value / 100)]} hundred`);
    value %= 100;
  }
  if (value >= 20) {
    parts.push(tens[Math.floor(value / 10)] + (value % 10 ? `-${smallNumbers[value % 10]}` : ""));
  } else if (value > 0) {
    parts.push(smallNumbers[value]);
  }
  return parts.join(" ");
}

export function amountInWords(cents: bigint) {
  const whole = cents / 100n;
  const paisa = cents % 100n;
  const units: [bigint, string][] = [
    [1_000_000_000_000n, "trillion"],
    [1_000_000_000n, "billion"],
    [1_000_000n, "million"],
    [1_000n, "thousand"],
    [1n, ""],
  ];
  let remaining = whole;
  const parts: string[] = [];
  for (const [unit, name] of units) {
    const segment = remaining / unit;
    if (segment > 0n) {
      parts.push(`${wordsBelowThousand(Number(segment))}${name ? ` ${name}` : ""}`);
      remaining %= unit;
    }
  }
  const majorWords = whole === 0n ? "zero" : parts.join(" ");
  return `Rupees ${majorWords}${paisa > 0n ? ` and ${wordsBelowThousand(Number(paisa))} paisa` : ""} only`;
}

export function getBillDisplayStatus(
  status: string,
  dueDate: Date | null,
  outstandingCents: bigint,
  today = new Date(),
) {
  if (
    (status === "ISSUED" || status === "PARTIALLY_PAID") &&
    dueDate &&
    dueDate < new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) &&
    outstandingCents > 0n
  ) {
    return "OVERDUE";
  }
  return status;
}
