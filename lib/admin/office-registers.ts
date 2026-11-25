import { z } from "zod";

type FieldType = "text" | "textarea" | "date" | "time" | "number" | "integer" | "select" | "staff" | "task" | "document";
export type RegisterField = {
  key: string;
  label: string;
  type?: FieldType;
  options?: readonly string[];
  required?: boolean;
};
export type RegisterSection = {
  key: string;
  label: string;
  repeat?: boolean;
  fields: readonly RegisterField[];
};
export type RegisterDefinition = {
  title: string;
  clientRequired: boolean;
  sections: readonly RegisterSection[];
};

const approvals: RegisterSection = {
  key: "approval",
  label: "Preparation and approval",
  fields: [
    { key: "prepared", label: "Prepared by", type: "staff" },
    { key: "preparedDate", label: "Prepared date", type: "date" },
    { key: "checked", label: "Checked by", type: "staff" },
    { key: "checkedDate", label: "Checked date", type: "date" },
    { key: "verified", label: "Verified by", type: "staff" },
    { key: "verifiedDate", label: "Verified date", type: "date" },
    { key: "approved", label: "Approved by", type: "staff" },
    { key: "approvedDate", label: "Approved date", type: "date" },
  ],
};

const tasks: RegisterSection = {
  key: "tasks",
  label: "Work and follow-up tracking",
  repeat: true,
  fields: [
    { key: "task", label: "Existing work / task", type: "task", required: true },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "startedBy", label: "Started by", type: "staff" },
    { key: "currentStage", label: "Current stage / progress" },
    { key: "currentFileWith", label: "Current file with", type: "staff" },
    { key: "targetDate", label: "Target completion", type: "date" },
    { key: "followUpDate", label: "Follow-up date", type: "date" },
    { key: "discussion", label: "Discussion / update", type: "textarea" },
    { key: "nextFollowUp", label: "Next follow-up date", type: "date" },
    { key: "remarks", label: "Remarks / next action", type: "textarea" },
  ],
};

const ads: RegisterSection = {
  key: "ads",
  label: "Facebook ads order and response",
  repeat: true,
  fields: [
    { key: "campaign", label: "Campaign / post", required: true },
    { key: "orderDate", label: "Order date", type: "date" },
    { key: "budget", label: "Budget (NPR)", type: "number" },
    { key: "duration", label: "Duration" },
    { key: "response", label: "Order / client response", type: "select", options: ["Order", "Pending", "Confirmed", "Ignored"] },
    { key: "nextFollowUp", label: "Next follow-up date", type: "date" },
  ],
};

const receivedDocuments: RegisterSection = {
  key: "documents",
  label: "Documents received from client",
  repeat: true,
  fields: [
    { key: "document", label: "Existing document", type: "document", required: true },
    { key: "quantity", label: "Quantity", type: "integer" },
    { key: "receivedDate", label: "Received date", type: "date" },
    { key: "receivedBy", label: "Received by", type: "staff" },
    { key: "form", label: "Original or copy", type: "select", options: ["Original", "Copy"] },
  ],
};

const actionPlan: RegisterSection = {
  key: "actions",
  label: "Follow-up and next action plan",
  repeat: true,
  fields: [
    { key: "action", label: "Action / task", required: true },
    { key: "responsible", label: "Responsible staff", type: "staff" },
    { key: "date", label: "Target / follow-up date", type: "date" },
    { key: "status", label: "Status", type: "select", options: ["Pending", "In progress", "Completed"] },
  ],
};

const clientDetails: RegisterSection = {
  key: "details",
  label: "Reference and service details",
  fields: [
    { key: "source", label: "Client source", type: "select", options: ["Direct", "Reference", "Facebook / ads", "Website", "Phone inquiry", "Repeat client", "Other"] },
    { key: "reference", label: "Reference by / other source" },
    { key: "alternateMobile", label: "Alternate mobile", type: "text" },
    { key: "designation", label: "Contact person designation" },
    { key: "expectedCompletion", label: "Expected completion", type: "date" },
  ],
};

const workTypes: RegisterSection = {
  key: "workTypes",
  label: "Work types / client categories",
  repeat: true,
  fields: [
    { key: "type", label: "Work type", type: "select", required: true, options: ["PAN", "VAT", "Company", "OCR", "Tax clearance", "Training", "Consultancy", "Accounting / bookkeeping", "Other"] },
    { key: "details", label: "Details / other work type" },
  ],
};

const posting: RegisterSection = {
  key: "posting",
  label: "Posting / client register status",
  fields: [
    { key: "clientRegister", label: "Posted in client register", type: "select", options: ["Yes", "No"] },
    { key: "workSheet", label: "Posted in work / production sheet", type: "select", options: ["Yes", "No"] },
    { key: "facebook", label: "Posted on Facebook", type: "select", options: ["Yes", "No"] },
    { key: "reason", label: "If not, reason", type: "textarea" },
    { key: "notes", label: "Discussion / key notes", type: "textarea" },
  ],
};

export const registerDefinitions = {
  "client-follow-up": {
    title: "Client follow-up, ads order and work register",
    clientRequired: true,
    sections: [
      { key: "period", label: "Register period", fields: [
        { key: "month", label: "Month" },
        { key: "from", label: "From date", type: "date" },
        { key: "to", label: "To date", type: "date" },
        { key: "staff", label: "Staff", type: "staff" },
      ] },
      clientDetails, workTypes, tasks, ads, posting, actionPlan, approvals,
    ],
  },
  "client-tracking": {
    title: "Client tracking, follow-up and ads order register",
    clientRequired: true,
    sections: [clientDetails, workTypes, tasks, ads, posting, receivedDocuments, actionPlan, approvals],
  },
  "file-movement": {
    title: "Client work tracking and file movement register",
    clientRequired: true,
    sections: [
      clientDetails, workTypes, tasks, receivedDocuments,
      { key: "movements", label: "File movement / handover", repeat: true, fields: [
        { key: "from", label: "From", type: "staff", required: true },
        { key: "to", label: "To", type: "staff", required: true },
        { key: "date", label: "Handover date", type: "date", required: true },
        { key: "purpose", label: "Purpose / stage" },
        { key: "initial", label: "Sign / initial" },
      ] },
      { key: "portals", label: "Portal / user access details (no passwords)", repeat: true, fields: [
        { key: "portal", label: "Portal / system", required: true },
        { key: "userId", label: "User ID / reference" },
        { key: "remarks", label: "Remarks" },
      ] },
      { key: "notes", label: "Discussion / notes / issues", fields: [
        { key: "discussion", label: "Discussion and notes", type: "textarea" },
      ] },
      actionPlan, approvals,
    ],
  },
  "staff-time": {
    title: "Staff time card and daily work report",
    clientRequired: false,
    sections: [
      { key: "shift", label: "Daily report details", fields: [
        { key: "date", label: "Date", type: "date", required: true },
        { key: "shift", label: "Shift", type: "select", options: ["Morning", "Day", "Full day"] },
        { key: "department", label: "Department" },
        { key: "notes", label: "Key notes / discussion", type: "textarea" },
      ] },
      { key: "entries", label: "Staff work and time", repeat: true, fields: [
        { key: "staff", label: "Staff", type: "staff", required: true },
        { key: "task", label: "Existing work / task", type: "task", required: true },
        { key: "start", label: "Start time", type: "time", required: true },
        { key: "end", label: "End time", type: "time", required: true },
        { key: "remarks", label: "Remarks" },
      ] },
      approvals,
    ],
  },
} satisfies Record<string, RegisterDefinition>;

export type RegisterKind = keyof typeof registerDefinitions;
export type RegisterData = Record<string, Array<Record<string, string>>>;

export function isRegisterKind(value: string): value is RegisterKind {
  return Object.hasOwn(registerDefinitions, value);
}

export function validateRegisterData(kind: RegisterKind, input: unknown) {
  const definition: RegisterDefinition = registerDefinitions[kind];
  const sections: Record<string, z.ZodType> = {};
  for (const section of definition.sections) {
    const fields: Record<string, z.ZodType> = {};
    for (const field of section.fields) {
      let schema = z.string().trim().max(field.type === "textarea" ? 5000 : 200);
      if (field.required) schema = schema.min(1, `${field.label} is required.`);
      fields[field.key] = schema.refine((value) => {
        if (!value) return true;
        if (field.type === "date") return z.iso.date().safeParse(value).success;
        if (field.type === "time") return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
        if (field.type === "number") return /^\d{1,12}(\.\d{1,2})?$/.test(value);
        if (field.type === "integer") return /^\d{1,9}$/.test(value);
        if (field.type === "select") return field.options?.includes(value) ?? false;
        if (field.type === "staff" || field.type === "task" || field.type === "document") {
          return /^c[a-z0-9]{24}$/i.test(value);
        }
        return true;
      }, `Enter a valid ${field.label.toLowerCase()}.`);
    }
    sections[section.key] = z.array(z.object(fields).strict())
      .max(section.repeat ? 50 : 1)
      .min(section.repeat ? 0 : 1);
  }
  const result = z.object(sections).strict().safeParse(input);
  if (!result.success) return { success: false as const, error: result.error.issues[0]?.message ?? "Invalid register data." };
  const data = z.record(z.string(), z.array(z.record(z.string(), z.string()))).parse(result.data);
  if (kind === "client-follow-up" && data.period[0].from && data.period[0].to && data.period[0].from > data.period[0].to) {
    return { success: false as const, error: "The register period end date must not be before its start date." };
  }
  if (kind === "staff-time" && data.entries.some((entry) => entry.end <= entry.start)) {
    return { success: false as const, error: "End time must be later than start time on the same day." };
  }
  return { success: true as const, data };
}
