import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Calculator,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Files,
  IdCard,
  Landmark,
  Mail,
  MapPinned,
  Phone,
  ReceiptText,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { EnquiryForm } from "./components/enquiry-form";
import { SiteHeader } from "./components/site-header";

export const metadata: Metadata = {
  title: "Tax & Business Consultancy",
  description:
    "Global Tax Nepal supports individuals, entrepreneurs and organizations with tax consultancy, business registration, financial review, documentation and compliance.",
};

type Offering = {
  title: string;
  description: string;
  who: string;
  support: string;
  icon: LucideIcon;
};

const serviceGroups: {
  id: string;
  number: string;
  title: string;
  intro: string;
  icon: LucideIcon;
  offerings: Offering[];
}[] = [
  {
    id: "tax-services",
    number: "01",
    title: "Tax Consultancy",
    intro:
      "Tax planning, filing and compliance support for individuals and businesses.",
    icon: FileCheck2,
    offerings: [
      {
        title: "Tax Planning & Filing",
        description:
          "Preparation and filing support for individual and corporate tax returns, based on the information and documents provided.",
        who: "Individuals and businesses preparing tax returns or reviewing tax-related requirements.",
        support:
          "Discussing relevant records, organizing return information and supporting the filing process.",
        icon: Calculator,
      },
      {
        title: "Tax Compliance",
        description:
          "Support with tax documentation and return-related requirements for individuals and businesses.",
        who: "Individuals and businesses seeking help organizing tax-related records and requirements.",
        support:
          "Reviewing the available paperwork and clarifying the agreed consultancy steps.",
        icon: FileCheck2,
      },
    ],
  },
  {
    id: "business-services",
    number: "02",
    title: "Business Registration & Consultancy",
    intro:
      "Guidance with business setup, company registration and related documentation.",
    icon: BriefcaseBusiness,
    offerings: [
      {
        title: "Company Registration",
        description:
          "Support with company registration procedures, PAN/VAT registration requirements and related documentation.",
        who: "Entrepreneurs, founders and organizations preparing to register a company.",
        support:
          "Discussing the applicable process and helping prepare and organize relevant information and documents.",
        icon: Building2,
      },
      {
        title: "Business Setup",
        description:
          "Support with the administrative and documentation requirements involved in setting up a business.",
        who: "People planning a business, entrepreneurs and organizations working through setup requirements.",
        support:
          "Understanding your requirements and organizing the relevant setup steps and paperwork.",
        icon: BriefcaseBusiness,
      },
      {
        title: "OCR Services",
        description:
          "Assistance with Office of Company Registrar-related processes and documentation.",
        who: "Businesses and entrepreneurs dealing with OCR-related paperwork.",
        support:
          "Help understanding the relevant process and preparing or organizing required documents.",
        icon: Landmark,
      },
      {
        title: "Business Consultancy",
        description:
          "Business consulting on structure, growth and the financial considerations involved in running an organization.",
        who: "Startups, established businesses and people planning a business.",
        support:
          "Discussing your goals and requirements, then identifying relevant consultancy support and next steps.",
        icon: BriefcaseBusiness,
      },
      {
        title: "PAN Registration",
        description:
          "Support with PAN registration requirements and the related application documentation.",
        who: "Individuals and businesses preparing for PAN registration.",
        support:
          "Guidance on relevant requirements and help organizing application information and paperwork.",
        icon: IdCard,
      },
      {
        title: "VAT Registration",
        description:
          "Assistance with understanding VAT registration requirements and preparing relevant documentation.",
        who: "Businesses reviewing or preparing for VAT registration.",
        support:
          "Discussing your situation, relevant paperwork and the steps involved in preparing documentation.",
        icon: ReceiptText,
      },
    ],
  },
  {
    id: "accounting-services",
    number: "03",
    title: "Accounting & Financial Support",
    intro:
      "Financial review and reporting support to help keep business records organized.",
    icon: WalletCards,
    offerings: [
      {
        title: "Financial Review & Compliance",
        description:
          "Review of financial statements and reporting support to help maintain accurate, organized records.",
        who: "Businesses looking to review financial statements and organize financial reporting.",
        support:
          "Reviewing available financial information and discussing documentation and reporting requirements.",
        icon: ClipboardCheck,
      },
      {
        title: "Audit & Assurance",
        description:
          "Financial audit and reporting support to help make records and relevant information easier to review.",
        who: "Businesses preparing financial records and documents for audit-related work.",
        support:
          "Organizing relevant financial information and supporting documentation for the agreed review.",
        icon: Files,
      },
    ],
  },
  {
    id: "documentation-services",
    number: "04",
    title: "Documentation & Client Management",
    intro:
      "Organized access to essential business documents and clearer records of fees and due dates.",
    icon: Files,
    offerings: [
      {
        title: "Document Management",
        description:
          "Folder-based organization of important documents such as PAN, tax clearance and audit records.",
        who: "Individuals and businesses who need help organizing important business and tax documents.",
        support:
          "Support arranging documents into a clear structure for easier reference and management.",
        icon: Files,
      },
      {
        title: "Document Vault",
        description:
          "Support for organizing essential business and tax paperwork so it is easier to find and manage.",
        who: "Clients managing important records such as registration, tax and audit documents.",
        support:
          "We discuss how to organize and maintain relevant records as part of the agreed consultancy work.",
        icon: FileCheck2,
      },
      {
        title: "Fee & Due Management",
        description:
          "Support for keeping agreed fees, due dates and related payment records organized.",
        who: "Clients and businesses who want clearer records of fees and due dates.",
        support:
          "Organizing fee and due information and related receipts as part of the agreed client support.",
        icon: WalletCards,
      },
    ],
  },
];

const processSteps = [
  {
    number: "01",
    title: "Initial Enquiry",
    description:
      "Get in touch and tell us what kind of tax or business support you are looking for.",
  },
  {
    number: "02",
    title: "Understand Requirements",
    description:
      "We discuss your situation, expectations and the service requirements relevant to your enquiry.",
  },
  {
    number: "03",
    title: "Document Collection",
    description:
      "We identify and organize the information and documents needed for the agreed work.",
  },
  {
    number: "04",
    title: "Consultancy & Processing",
    description:
      "The consultancy work proceeds according to the agreed requirements, with communication as needed.",
  },
  {
    number: "05",
    title: "Completion & Handover",
    description:
      "We share the completed work and explain any relevant follow-up steps or records to keep.",
  },
];

const values = [
  "Professionalism",
  "Transparency",
  "Accountability",
  "Client-focused service",
  "Organized documentation",
];

const commitments = [
  {
    title: "Data Security First",
    description:
      "We recognize that financial and business documents are sensitive and treat their handling with care.",
  },
  {
    title: "Absolute Transparency",
    description:
      "We aim to communicate the agreed work, documentation needs and next steps clearly.",
  },
  {
    title: "Expert Support",
    description:
      "We provide professional guidance across the tax and business requirements we support.",
  },
];

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
const mapsUrl =
  "https://www.google.com/maps/place/Popular+Accounting+Solution/@27.025344,84.885653,21z/data=!4m14!1m7!3m6!1s0x3993555c33bc9f2d:0xbf98288050de15ce!2sPopular+Accounting+Solution!8m2!3d27.025344!4d84.885653!16s%2Fg%2F11t6l8khsw!3m5!1s0x3993555c33bc9f2d:0xbf98288050de15ce!8m2!3d27.025344!4d84.885653!16s%2Fg%2F11t6l8khsw?entry=ttu";
const mapEmbedUrl =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d203.24281313410756!2d84.88565300000001!3d27.025343999999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3993555c33bc9f2d%3A0xbf98288050de15ce!2sPopular%20Accounting%20Solution!5e0!3m2!1sen!2snp!4v1738517500000!5m2!1sen!2snp";
const facebookUrl =
  "https://www.facebook.com/p/Popular-Accounting-Solutions-100083817784944/";
const whatsappUrl = "https://wa.me/9779855024715";

const governmentResources = [
  { label: "DCSI Nepal", href: "http://dcsi.gov.np/en" },
  { label: "Revenue Management", href: "https://revenue.fcgo.gov.np/" },
  { label: "Social Security Fund", href: "https://ssf.gov.np/" },
  { label: "Department of Commerce", href: "https://online.doc.gov.np/" },
  { label: "OCR Online", href: "https://application.ocr.gov.np/" },
  { label: "CAMIS OCR", href: "https://camis.ocr.gov.np/" },
  { label: "Inland Revenue Department", href: "https://ird.gov.np/" },
];

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  centered = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
        {eyebrow}
      </p>
      <h2
        className="text-section-title font-semibold leading-tight tracking-[-0.03em] text-primary"
        id={id}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-7 text-text-secondary">
          {description}
        </p>
      )}
    </div>
  );
}

function ServiceOffering({ offering }: { offering: Offering }) {
  const Icon = offering.icon;

  return (
    <article className="service-offering grid gap-x-6 gap-y-3 border-t border-border py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:py-6">
      <div>
        <div className="flex items-start gap-3">
          <Icon aria-hidden="true" className="icon mt-1 text-secondary" />
          <div>
            <h4 className="text-base font-semibold leading-snug text-primary">
              {offering.title}
            </h4>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {offering.description}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 pl-8 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              Who may need this
            </dt>
            <dd className="mt-1 leading-6 text-text">{offering.who}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
              Support provided
            </dt>
            <dd className="mt-1 leading-6 text-text">{offering.support}</dd>
          </div>
        </dl>
      </div>
      <a
        className="group inline-flex w-fit items-center gap-2 self-end text-sm font-semibold text-secondary transition-colors duration-200 ease-out hover:text-primary sm:mb-1"
        href="#contact"
      >
        Enquire
        <ArrowRight
          aria-hidden="true"
          className="icon transition-transform duration-200 ease-out group-hover:translate-x-1"
        />
      </a>
    </article>
  );
}

function ServiceGroup({
  group,
  index,
}: {
  group: (typeof serviceGroups)[number];
  index: number;
}) {
  const Icon = group.icon;

  return (
    <section
      aria-labelledby={`${group.id}-title`}
      className={`service-group relative isolate overflow-hidden py-12 sm:py-14 ${
        index % 2 === 0 ? "bg-surface" : "bg-background"
      }`}
      id={group.id}
    >
      {index === 0 && (
        <Image
          alt=""
          aria-hidden="true"
          className="devotional-watermark devotional-watermark-ganesh"
          height={667}
          src="/assets/shri-ganesh-ji.jpg"
          width={500}
        />
      )}
      <div className="site-container relative z-10 grid gap-6 lg:grid-cols-[0.68fr_1.32fr] lg:gap-16">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-secondary">
            {group.number} / SERVICES
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Icon aria-hidden="true" className="icon text-secondary" />
            <h3
              className="text-xl font-semibold tracking-[-0.02em] text-primary sm:text-2xl"
              id={`${group.id}-title`}
            >
              {group.title}
            </h3>
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
            {group.intro}
          </p>
        </div>
        <div>
          {group.offerings.map((offering) => (
            <ServiceOffering key={offering.title} offering={offering} />
          ))}
          {group.id === "accounting-services" && (
            <figure className="relative mt-5 min-h-48 overflow-hidden bg-[#d9dce1] sm:min-h-56">
              <Image
                alt="Business paperwork being organized at a desk"
                className="h-full w-full object-cover"
                fill
                sizes="(max-width: 1023px) 100vw, 55vw"
                src="/assets/organized-business-records.jpg"
              />
              <figcaption className="absolute bottom-0 left-0 bg-surface px-4 py-3 text-xs font-medium text-primary">
                Keeping important records in order
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <a
        className="sr-only rounded bg-surface p-3 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
        href="#main-content"
      >
        Skip to content
      </a>
      <SiteHeader />

      <main id="main-content">
        <section
          aria-labelledby="hero-title"
          className="hero-section scroll-target relative overflow-hidden border-b border-border"
          id="home"
        >
          <div className="site-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-20">
            <div className="relative z-10 max-w-2xl lg:py-6">
              <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.17em] text-secondary">
                <span aria-hidden="true" className="h-px w-8 bg-highlight" />
                Empowering Your Financial Success, Together. With Tax
                Excellence.
              </p>
              <h1
                className="max-w-[17ch] text-display font-semibold leading-[1.06] tracking-[-0.045em] text-primary"
                id="hero-title"
              >
                Building Trust. Protecting Business. Enabling Growth.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
                Your trusted partner for tax consultancy, business registration,
                accounting and professional business support. We simplify
                complex requirements so individuals and businesses can focus on
                what matters most.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a className="button button-primary" href="#contact">
                  Get Consultation
                  <ArrowRight aria-hidden="true" className="icon" />
                </a>
                <a className="button button-secondary" href="#services">
                  Explore Services
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-5">
                <a
                  className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-secondary"
                  href="#tax-services"
                >
                  Tax Consultancy
                  <ArrowUpRight
                    aria-hidden="true"
                    className="icon text-secondary transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
                <a
                  className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-secondary"
                  href="#business-services"
                >
                  Business Consultancy
                  <ArrowUpRight
                    aria-hidden="true"
                    className="icon text-secondary transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              </div>
            </div>

            <figure className="hero-figure relative z-10 lg:ml-auto lg:w-full">
              <div className="relative aspect-[1.12/1] overflow-hidden bg-[#d9dce1] sm:aspect-[1.25/1] lg:aspect-[0.96/1]">
                <Image
                  alt="Bright, modern office interior"
                  className="h-full w-full object-cover"
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, 46vw"
                  src="/assets/consultancy-office.jpg"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1 border-l-[3px] border-highlight"
                />
                <p className="absolute bottom-4 left-5 text-xs font-medium uppercase tracking-[0.14em] text-white [text-shadow:0_1px_4px_rgb(0_0_0_/_70%)] sm:bottom-5 sm:left-6">
                  Professional support for your next step
                </p>
              </div>
              <figcaption className="grid grid-cols-2 border border-t-0 border-border bg-surface">
                <a
                  className="group flex min-h-16 items-center justify-between gap-2 border-r border-border px-4 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:bg-background sm:px-5"
                  href="#tax-services"
                >
                  Tax Consultancy
                  <ArrowRight
                    aria-hidden="true"
                    className="icon text-secondary transition-transform duration-200 ease-out group-hover:translate-x-1"
                  />
                </a>
                <a
                  className="group flex min-h-16 items-center justify-between gap-2 px-4 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:bg-background sm:px-5"
                  href="#business-services"
                >
                  Business Consultancy
                  <ArrowRight
                    aria-hidden="true"
                    className="icon text-secondary transition-transform duration-200 ease-out group-hover:translate-x-1"
                  />
                </a>
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          aria-labelledby="overview-title"
          className="scroll-target border-b border-border bg-surface py-10 sm:py-12"
          id="overview"
        >
          <div className="site-container grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
              Our perspective
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-8">
              <h2
                className="max-w-3xl text-xl font-medium leading-snug tracking-[-0.02em] text-primary sm:text-2xl"
                id="overview-title"
              >
                Professional document management and financial consulting
                reimagined for the modern era.
              </h2>
              <a
                className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href="#about"
              >
                Get to know us
                <ArrowRight
                  aria-hidden="true"
                  className="icon transition-transform duration-200 ease-out group-hover:translate-x-1"
                />
              </a>
            </div>
            <p className="text-sm leading-6 text-text-secondary lg:col-start-2">
              Global Tax Nepal supports people and businesses with tax
              consultancy, company setup, financial review and organized
              documentation—helping make compliance a more manageable part of
              business growth.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="about-title"
          className="about-section scroll-target relative isolate overflow-hidden bg-background py-16 sm:py-20 lg:py-24"
          id="about"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="devotional-watermark devotional-watermark-khatu"
            height={260}
            src="/assets/khatu-shyam-ji.jpg"
            width={195}
          />
          <div className="site-container relative z-10">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end lg:gap-16">
              <SectionHeading
                id="about-title"
                eyebrow="About Global Tax Nepal"
                title="Your Partner in Tax, Compliance and Business Growth."
              />
              <p className="max-w-2xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
                We support individuals, entrepreneurs, startups and established
                businesses as they navigate tax and business requirements.
                Through organized consultancy support, we help make the work
                behind registration, accounting and compliance easier to
                understand.
              </p>
            </div>

            <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
              <figure className="relative min-h-64 overflow-hidden bg-[#d9dce1] sm:min-h-80 lg:min-h-[28rem]">
                <Image
                  alt="Professionals reviewing business documents together"
                  className="h-full w-full object-cover"
                  fill
                  sizes="(max-width: 1023px) 100vw, 45vw"
                  src="/assets/business-consultation.jpg"
                />
                <figcaption className="absolute bottom-0 left-0 bg-surface px-4 py-3 text-xs font-medium text-primary sm:px-5">
                  Clear conversations. Organized support.
                </figcaption>
              </figure>

              <div className="divide-y divide-border border-y border-border">
                <article className="grid gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-5 sm:py-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Who we are
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    Global Tax Nepal is a tax and business consultancy
                    supporting individuals, entrepreneurs, startups and
                    established businesses with their tax and business
                    requirements.
                  </p>
                </article>
                <article className="grid gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-5 sm:py-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    What we do
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    We support registrations, taxation, accounting,
                    financial review, documentation and business consultancy.
                  </p>
                </article>
                <article className="grid gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-5 sm:py-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Our mission
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    To bridge the gap between complex tax requirements and
                    business owners, making financial compliance a more
                    understandable part of business growth.
                  </p>
                </article>
                <article className="grid gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-5 sm:py-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Our vision
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    To build lasting relationships through reliable, organized
                    and professional consultancy support.
                  </p>
                </article>
              </div>
            </div>

            <div className="mt-10 grid gap-8 border-t border-border pt-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                  Our values
                </p>
                <h3 className="mt-3 text-lg font-semibold text-primary">
                  How we approach our work.
                </h3>
              </div>
              <ul className="flex flex-wrap gap-x-7 gap-y-3">
                {values.map((value) => (
                  <li
                    className="flex items-center gap-2 text-sm font-medium text-text"
                    key={value}
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-highlight"
                    />
                    {value}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 grid gap-8 border-t border-border pt-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                  Our commitments
                </p>
                <h3 className="mt-3 text-lg font-semibold text-primary">
                  Principles behind our support.
                </h3>
              </div>
              <div className="divide-y divide-border border-y border-border">
                {commitments.map((commitment) => (
                  <article
                    className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5"
                    key={commitment.title}
                  >
                    <h4 className="text-sm font-semibold text-primary">
                      {commitment.title}
                    </h4>
                    <p className="text-sm leading-6 text-text-secondary">
                      {commitment.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <figure className="mt-10 border-y border-border py-7 sm:py-9 lg:ml-[calc(58.333%-2rem)] lg:pl-8">
              <blockquote className="max-w-3xl text-xl font-medium leading-relaxed tracking-[-0.02em] text-primary sm:text-2xl">
                “Our goal is to make tax compliance the easiest part of running
                your business.”
              </blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-text-secondary">
                Gajendra Kumar Sony <span className="font-normal">— Founder</span>
              </figcaption>
            </figure>

            <div className="mt-12 grid gap-8 border-t border-border pt-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                  Why professional consultancy
                </p>
                <h3 className="mt-3 max-w-lg text-xl font-semibold leading-tight tracking-[-0.025em] text-primary sm:text-2xl">
                  Business requirements are easier to manage when the details
                  are in order.
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <p className="border-t border-border pt-4 text-sm leading-6 text-text-secondary">
                  Proper documentation helps keep essential records organized
                  and available when they are needed.
                </p>
                <p className="border-t border-border pt-4 text-sm leading-6 text-text-secondary">
                  Understanding relevant compliance requirements helps people
                  plan their next steps with more clarity.
                </p>
                <p className="border-t border-border pt-4 text-sm leading-6 text-text-secondary">
                  Organized business processes make it easier to follow
                  responsibilities and manage routine work.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="services-title"
          className="services-section scroll-target border-y border-border bg-surface"
          id="services"
        >
          <div className="site-container py-14 sm:py-16 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:gap-16">
              <SectionHeading
                id="services-title"
                eyebrow="Our services"
                title="Practical support across your business requirements."
              />
              <p className="max-w-lg pb-1 text-sm leading-6 text-text-secondary sm:text-base">
                Explore the company’s published tax, business, financial review
                and documentation support. Each enquiry begins with
                understanding your specific requirements.
              </p>
            </div>
          </div>
          {serviceGroups.map((group, index) => (
            <ServiceGroup group={group} index={index} key={group.id} />
          ))}
          <div className="border-t border-border bg-primary py-6 text-white">
            <div className="site-container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-white/85">
                The support required can depend on your circumstances. We can
                discuss the relevant requirements during an initial enquiry.
              </p>
              <a className="button button-light w-fit" href="#contact">
                Discuss your requirements
                <ArrowRight aria-hidden="true" className="icon" />
              </a>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="process-title"
          className="process-section scroll-target relative isolate overflow-hidden border-y border-border bg-background py-16 sm:py-20 lg:py-24"
          id="process"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="devotional-watermark devotional-watermark-khatu"
            height={260}
            src="/assets/khatu-shyam-ji.jpg"
            width={195}
          />
          <div className="site-container relative z-10">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
              <SectionHeading
                id="process-title"
                eyebrow="Our process"
                title="Simple Steps. Organized Support. Clear Outcomes."
              />
              <p className="max-w-xl pb-1 text-sm leading-6 text-text-secondary sm:text-base">
                Each engagement starts with a conversation and moves forward
                through clear, agreed stages.
              </p>
            </div>
            <ol className="process-timeline mt-10 grid gap-y-2 sm:grid-cols-2 sm:gap-x-8 lg:mt-14 lg:grid-cols-5 lg:gap-x-5">
              {processSteps.map((step) => (
                <li className="process-step relative" key={step.number}>
                  <span className="process-marker" aria-hidden="true">
                    {step.number}
                  </span>
                  <div className="process-step-content">
                    <h3 className="text-base font-semibold leading-snug text-primary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="contact-title"
          className="contact-section scroll-target bg-white py-16 sm:py-20 lg:py-24"
          id="contact"
        >
          <div className="site-container">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <SectionHeading
                  id="contact-title"
                  eyebrow="Contact"
                  title="Let’s Discuss Your Business Requirements."
                  description="Tell us what you need help with. We’ll use your enquiry to understand your requirements and discuss the relevant next steps."
                />
                <div className="mt-8 divide-y divide-border border-y border-border">
                  <div className="flex gap-4 py-4">
                    <MapPinned
                      aria-hidden="true"
                      className="icon mt-0.5 text-secondary"
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-primary">
                        Office location
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        Popular Accounting Solutions, Birgunj, Nepal
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-border">
                    <div className="flex gap-4 py-4 sm:pr-4">
                      <Phone
                        aria-hidden="true"
                        className="icon mt-0.5 text-secondary"
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-primary">
                          Contact number
                        </h3>
                        <a
                          className="mt-1 inline-block text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                          href="tel:+9779855024715"
                        >
                          +977 9855024715
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-4 border-t border-border py-4 sm:border-0 sm:pl-4">
                      <Mail
                        aria-hidden="true"
                        className="icon mt-0.5 text-secondary"
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-primary">
                          Email address
                        </h3>
                        {contactEmail ? (
                          <a
                            className="mt-1 inline-block break-all text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                            href={`mailto:${contactEmail}`}
                          >
                            {contactEmail}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-text-secondary">
                            Email address to be confirmed.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 py-4">
                    <Clock3
                      aria-hidden="true"
                      className="icon mt-0.5 text-secondary"
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-primary">
                        Business hours
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        Please contact us for current hours.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden border border-border bg-background">
                  <iframe
                    className="block aspect-[4/3] w-full border-0 sm:aspect-[16/9]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapEmbedUrl}
                    title="Map to Popular Accounting Solution in Birgunj"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                    <span className="text-sm font-medium text-primary">
                      Popular Accounting Solutions, Birgunj
                    </span>
                    <a
                      className="group inline-flex items-center gap-1 text-sm font-semibold text-secondary transition-colors duration-200 ease-out hover:text-primary"
                      href={mapsUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Open in Google Maps
                      <ArrowUpRight aria-hidden="true" className="icon" />
                    </a>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                  <a
                    className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-secondary"
                    href={facebookUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Facebook
                    <ArrowUpRight aria-hidden="true" className="icon" />
                  </a>
                  <a
                    className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-secondary"
                    href={whatsappUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    WhatsApp
                    <ArrowUpRight aria-hidden="true" className="icon" />
                  </a>
                </div>
              </div>

              <div className="border border-border bg-background p-5 sm:p-8 lg:p-9">
                <div className="mb-6 border-b border-border pb-5">
                  <h3 className="text-lg font-semibold text-primary">
                    Send an enquiry
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Fields marked with an asterisk are required.
                  </p>
                </div>
                <EnquiryForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border bg-surface">
        <div className="site-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.75fr_1fr_1.2fr] lg:gap-8 lg:py-14">
          <div>
            <a
              aria-label="Global Tax Nepal home"
              className="inline-flex"
              href="#home"
            >
              <Image
                alt="Global Tax Nepal"
                height={35}
                src="/assets/global-tax-nepal-logo.svg"
                width={200}
              />
            </a>
            <p className="mt-4 max-w-sm text-sm leading-6 text-text-secondary">
              Professional tax and business consultancy for individuals,
              entrepreneurs and organizations.
            </p>
            <div className="mt-4 space-y-2 text-sm text-text-secondary">
              <a
                className="block transition-colors duration-200 ease-out hover:text-primary"
                href="tel:+9779855024715"
              >
                +977 9855024715
              </a>
              <p>Popular Accounting Solutions, Birgunj, Nepal</p>
              {contactEmail ? (
                <a
                  className="block break-all transition-colors duration-200 ease-out hover:text-primary"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
              ) : (
                <p>Email address to be confirmed.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-primary">Explore</h2>
            <nav
              aria-label="Footer navigation"
              className="mt-3 flex flex-col gap-2"
            >
              {[
                ["Home", "#home"],
                ["About Us", "#about"],
                ["Services", "#services"],
                ["Our Process", "#process"],
                ["Contact", "#contact"],
              ].map(([label, href]) => (
                <a
                  className="w-fit text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                  href={href}
                  key={href}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-primary">
              Consultancy services
            </h2>
            <nav
              aria-label="Consultancy services"
              className="mt-3 flex flex-col gap-2"
            >
              {[
                ["Tax Planning & Filing", "#tax-services"],
                ["Tax Compliance", "#tax-services"],
                ["PAN & VAT Registration", "#business-services"],
                ["Company Registration", "#business-services"],
                ["Business Consultancy", "#business-services"],
                ["Financial Review", "#accounting-services"],
                ["Document Management", "#documentation-services"],
              ].map(([label, href]) => (
                <a
                  className="w-fit text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                  href={href}
                  key={label}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-primary">
              Government resources
            </h2>
            <nav
              aria-label="Government resources"
              className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2"
            >
              {governmentResources.map(({ label, href }) => (
                <a
                  className="w-fit text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                  href={href}
                  key={label}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-5 flex gap-5">
              <a
                className="text-sm font-medium text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href={facebookUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Facebook
              </a>
              <a
                className="text-sm font-medium text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href={whatsappUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="site-container flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-secondary">
              © {new Date().getFullYear()} Global Tax Nepal. All rights reserved.
            </p>
            <p className="text-[0.65rem] leading-5 text-text-secondary">
              Devotional watermarks by AdityaSharma92 and Shoot stufz,{" "}
              <a
                className="underline underline-offset-2"
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                rel="noreferrer"
                target="_blank"
              >
                CC BY-SA 4.0
              </a>
              .{" "}
              <a
                className="underline underline-offset-2"
                href="https://commons.wikimedia.org/wiki/File:Khatu_Shyam_Ji.jpg"
                rel="noreferrer"
                target="_blank"
              >
                Khatu Shyam Ji
              </a>{" "}
              ·{" "}
              <a
                className="underline underline-offset-2"
                href="https://commons.wikimedia.org/wiki/File:Ganesh_Murti_-_Traditional_Idol_of_Lord_Ganesha_018.jpg"
                rel="noreferrer"
                target="_blank"
              >
                Shri Ganesh Ji
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
