import { z } from "zod";

export const clientIdSchema = z.string().regex(/^c[a-z0-9]{24}$/i);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const clientFormSchema = z
  .object({
    type: z.enum(["INDIVIDUAL", "BUSINESS"]),
    displayName: z.string().trim().min(1, "Enter a client name.").max(200),
    contactPerson: optionalText(200),
    email: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === ""
          ? undefined
          : typeof value === "string"
            ? value.trim().toLowerCase()
            : value,
      z.string().email("Enter a valid email address.").max(254).optional(),
    ),
    phone: optionalText(40),
    additionalContactName: optionalText(200),
    additionalContactMobile: optionalText(40),
    additionalContactAddress: optionalText(500),
    additionalContactFirmName: optionalText(200),
    province: optionalText(100),
    district: optionalText(100),
    municipality: optionalText(150),
    wardNumber: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.coerce.number().int().min(1).max(99).optional(),
    ),
    streetAddress: optionalText(500),
    panNumber: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() !== ""
          ? value.replace(/\s+/g, "").toUpperCase()
          : undefined,
      z
        .string()
        .regex(/^\d{9}$/, "Enter a 9-digit PAN number.")
        .optional(),
    ),
    vatRegistered: z.enum(["true", "false"]).transform((value) => value === "true"),
    vatNumber: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() !== ""
          ? value.replace(/\s+/g, "").toUpperCase()
          : undefined,
      z.string().max(30).optional(),
    ),
    registrationDate: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.iso.date("Enter a valid registration date.").optional(),
    ),
    notes: optionalText(5000),
    isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
  });

export type ClientFormData = z.infer<typeof clientFormSchema>;

export function getClientIdLabel(id: string) {
  return `CL-${id.toUpperCase()}`;
}

export function getClientFormData(formData: FormData) {
  return clientFormSchema.safeParse({
    type: formData.get("type"),
    displayName: formData.get("displayName"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    additionalContactName: formData.get("additionalContactName"),
    additionalContactMobile: formData.get("additionalContactMobile"),
    additionalContactAddress: formData.get("additionalContactAddress"),
    additionalContactFirmName: formData.get("additionalContactFirmName"),
    province: formData.get("province"),
    district: formData.get("district"),
    municipality: formData.get("municipality"),
    wardNumber: formData.get("wardNumber"),
    streetAddress: formData.get("streetAddress"),
    panNumber: formData.get("panNumber"),
    vatRegistered: formData.get("vatRegistered"),
    vatNumber: formData.get("vatNumber"),
    registrationDate: formData.get("registrationDate"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive"),
  });
}
