"use client";

import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";

const serviceOptions = [
  "Tax Planning & Filing",
  "Tax Compliance",
  "Company Registration",
  "PAN Registration",
  "VAT Registration",
  "OCR Services",
  "Business Setup",
  "Business Consultancy",
  "Financial Review & Compliance",
  "Audit & Assurance",
  "Document Management",
  "Fee & Due Management",
  "Other",
];

type EnquiryResponse = {
  success?: boolean;
  message?: string;
};

function isEnquiryResponse(value: unknown): value is EnquiryResponse {
  return typeof value === "object" && value !== null;
}

export function EnquiryForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "idle" | "success" | "error";
    message: string;
  }>({
    kind: "idle",
    message: "Your enquiry will be sent to Global Tax Nepal for follow-up.",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedService = String(formData.get("service") || "");
    const subject = String(formData.get("subject") || "").trim();
    const fileInput = form.elements.namedItem("file");

    formData.delete("service");
    formData.delete("file");
    formData.set(
      "subject",
      `Service: ${selectedService}${subject ? ` | ${subject}` : ""}`,
    );

    if (fileInput instanceof HTMLInputElement && fileInput.files?.[0]) {
      formData.set("file", fileInput.files[0]);
    }

    setIsSubmitting(true);
    setNotice({ kind: "idle", message: "Sending your enquiry…" });

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        body: formData,
      });
      const payload: unknown = await response.json().catch(() => null);
      const responseMessage =
        isEnquiryResponse(payload) && typeof payload.message === "string"
          ? payload.message
          : undefined;

      if (!response.ok) {
        throw new Error(
          responseMessage ||
            `The enquiry service returned an error (${response.status}).`,
        );
      }

      if (!isEnquiryResponse(payload) || payload.success !== true) {
        throw new Error(
          responseMessage || "The enquiry service could not confirm submission.",
        );
      }

      form.reset();
      setNotice({
        kind: "success",
        message:
          responseMessage ||
          "Thank you. Your enquiry has been submitted successfully.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error
            ? `We couldn't submit your enquiry: ${error.message}`
            : "We couldn't submit your enquiry. Please try again or contact us by phone.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit}
      aria-describedby="form-notice"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="full-name">
            Full name <span aria-hidden="true">*</span>
          </label>
          <input
            autoComplete="name"
            className="form-control"
            id="full-name"
            name="name"
            placeholder="Your name"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="mobile">
            Mobile / WhatsApp number <span aria-hidden="true">*</span>
          </label>
          <input
            autoComplete="tel"
            className="form-control"
            id="mobile"
            name="whatsapp"
            placeholder="Your mobile number"
            required
            type="tel"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="email">
            Email address
          </label>
          <input
            autoComplete="email"
            className="form-control"
            id="email"
            name="email"
            placeholder="you@example.com"
            type="email"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="service-category">
            Service category <span aria-hidden="true">*</span>
          </label>
          <select
            className="form-control"
            defaultValue=""
            id="service-category"
            name="service"
            required
          >
            <option disabled value="">
              Choose a service
            </option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="subject">
          Subject
        </label>
        <input
          className="form-control"
          id="subject"
          name="subject"
          placeholder="Add a subject (optional)"
        />
      </div>
      <div>
        <label className="form-label" htmlFor="message">
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          className="form-control min-h-32 resize-y"
          id="message"
          name="message"
          placeholder="Share a few details about your requirements"
          required
          rows={5}
        />
      </div>
      <div>
        <label className="form-label" htmlFor="file">
          Supporting document <span className="font-normal">(optional)</span>
        </label>
        <input
          className="form-control file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-primary"
          id="file"
          name="file"
          type="file"
        />
      </div>
      <p
        className={`form-hint ${
          notice.kind === "error"
            ? "form-hint-error"
            : notice.kind === "success"
              ? "form-hint-success"
              : ""
        }`}
        id="form-notice"
        role={notice.kind === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {notice.message}
      </p>
      <button
        className="button button-primary disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Sending…" : "Submit Enquiry"}
        {!isSubmitting && <ArrowRight aria-hidden="true" className="icon" />}
      </button>
    </form>
  );
}
