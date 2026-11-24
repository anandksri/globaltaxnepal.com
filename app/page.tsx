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
  ShieldCheck,
  Sparkles,
  BadgeCheck,
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
  icon: LucideIcon;
};

const serviceGroups: {
  id: string;
  number: string;
  title: string;
  icon: LucideIcon;
  offerings: Offering[];
}[] = [
  {
    id: "tax-services",
    number: "01",
    title: "Tax Consultancy",
    icon: FileCheck2,
    offerings: [
      {
        title: "Tax Planning & Filing",
        description: "Tax return preparation and filing support for individuals and businesses.",
        icon: Calculator,
      },
      {
        title: "Tax Compliance",
        description: "Help organizing tax records and understanding related requirements.",
        icon: FileCheck2,
      },
      {
        title: "Tax Clearance",
        description: "Guidance with tax clearance documentation and process requirements.",
        icon: FileCheck2,
      },
    ],
  },
  {
    id: "business-services",
    number: "02",
    title: "Business Registration & Consultancy",
    icon: BriefcaseBusiness,
    offerings: [
      {
        title: "Company Registration",
        description: "Guidance with company registration steps and required paperwork.",
        icon: Building2,
      },
      {
        title: "Business Setup",
        description: "Support organizing the administrative steps for setting up a business.",
        icon: BriefcaseBusiness,
      },
      {
        title: "OCR Services",
        description: "Assistance with Office of Company Registrar processes and documents.",
        icon: Landmark,
      },
      {
        title: "Business Consultancy",
        description: "Practical advice on business structure, setup and administration.",
        icon: BriefcaseBusiness,
      },
      {
        title: "PAN Registration",
        description: "Help understanding PAN registration requirements and preparing documents.",
        icon: IdCard,
      },
      {
        title: "VAT Registration",
        description: "Guidance on VAT registration requirements and supporting paperwork.",
        icon: ReceiptText,
      },
    ],
  },
  {
    id: "accounting-services",
    number: "03",
    title: "Accounting & Financial Support",
    icon: WalletCards,
    offerings: [
      {
        title: "Financial Review & Compliance",
        description: "Financial statement review and reporting documentation support.",
        icon: ClipboardCheck,
      },
      {
        title: "Audit & Assurance",
        description: "Help organizing financial records for audit-related review.",
        icon: Files,
      },
      {
        title: "Accounting & Bookkeeping",
        description: "Organized accounting records and day-to-day bookkeeping support.",
        icon: Calculator,
      },
    ],
  },
  {
    id: "documentation-services",
    number: "04",
    title: "Documentation & Client Management",
    icon: Files,
    offerings: [
      {
        title: "Document Management",
        description: "Organize important PAN, tax clearance and audit documents.",
        icon: Files,
      },
      {
        title: "Document Vault",
        description: "Keep essential business and tax paperwork organized for reference.",
        icon: FileCheck2,
      },
      {
        title: "Fee & Due Management",
        description: "Organize agreed fees, due dates and related payment records.",
        icon: WalletCards,
      },
    ],
  },
];

const processSteps = [
  {
    number: "01",
    title: "Initial Enquiry",
    description: "Share what support you need.",
  },
  {
    number: "02",
    title: "Understand Requirements",
    description: "Clarify the work and required details.",
  },
  {
    number: "03",
    title: "Document Collection",
    description: "Gather and organize relevant documents.",
  },
  {
    number: "04",
    title: "Consultancy & Processing",
    description: "Proceed with the agreed consultancy work.",
  },
  {
    number: "05",
    title: "Completion & Handover",
    description: "Receive completed work and next steps.",
  },
];

const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ||
  process.env.CONTACT_EMAIL?.trim() ||
  "globaltaxnepal@gmail.com";
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
    <article className="service-offering grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 border-t border-border py-4 sm:grid-cols-[1.25rem_minmax(0,1fr)_auto] sm:gap-4">
      <Icon aria-hidden="true" className="icon mt-0.5 text-secondary" />
      <div>
        <h4 className="text-base font-semibold leading-snug text-primary">
          {offering.title}
        </h4>
        <p className="mt-1 text-sm leading-5 text-text-secondary">
          {offering.description}
        </p>
      </div>
      <a
        className="group col-start-2 inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-secondary transition-colors duration-200 ease-out hover:text-primary sm:col-start-3 sm:self-center"
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
          {index === 0 && (
            <div className="relative mt-3 h-28 sm:h-36 lg:mt-5 lg:h-[16rem]">
              <Image
                alt=""
                aria-hidden="true"
                className="devotional-watermark devotional-watermark-ganesh"
                height={667}
                src="/assets/shri-ganesh-ji.jpg"
                width={500}
              />
            </div>
          )}
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
                Tax &amp; Business Consultancy
              </p>
              <h1
                className="max-w-[17ch] text-display font-semibold leading-[1.06] tracking-[-0.045em] text-primary"
                id="hero-title"
              >
                Building Trust. Protecting Business. Enabling Growth.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
                Professional tax, registration and accounting support for
                individuals and businesses.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {[
                  "Reliable guidance",
                  "Clear documentation",
                  "Personal support",
                ].map((item) => (
                  <span
                    className="inline-flex items-center gap-1.5 border border-border bg-surface px-3 py-2 text-xs font-semibold text-primary"
                    key={item}
                  >
                    <BadgeCheck
                      aria-hidden="true"
                      className="size-3.5 text-secondary"
                    />
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a className="button button-primary" href="#contact">
                  Get Consultation
                  <ArrowRight aria-hidden="true" className="icon" />
                </a>
                <a className="button button-secondary" href="#services">
                  Explore Services
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
          className="scroll-target border-b border-border bg-surface py-7 sm:py-9"
          id="overview"
        >
          <div className="site-container">
            <h2
              className="max-w-4xl text-lg font-medium leading-snug tracking-[-0.02em] text-primary sm:text-xl"
              id="overview-title"
            >
              Empowering Your Financial Success, Together. With Tax Excellence.
              <span className="mt-1 block text-sm font-normal leading-6 text-text-secondary sm:text-base">
                Professional document management and financial consulting,
                reimagined for the modern era.
              </span>
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Compliance support",
                  text: "Organized, requirement-focused guidance.",
                },
                {
                  icon: BriefcaseBusiness,
                  title: "Business guidance",
                  text: "Practical support from setup to operation.",
                },
                {
                  icon: Sparkles,
                  title: "Clear communication",
                  text: "Straightforward advice and next steps.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <article
                  className="group grid grid-cols-[2.5rem_1fr] gap-3 border border-border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-lg hover:shadow-primary/5"
                  key={title}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-primary">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="about-title"
          className="about-section scroll-target relative isolate overflow-hidden bg-background py-12 sm:py-16 lg:py-20"
          id="about"
        >
          <div className="site-container relative z-10">
            <div className="max-w-3xl">
              <SectionHeading
                id="about-title"
                eyebrow="About Global Tax Nepal"
                title="Your tax and business consultancy partner."
              />
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
                    We support individuals, entrepreneurs and established
                    businesses with tax and business requirements.
                  </p>
                </article>
                <article className="grid gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-5 sm:py-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    What we do
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    Registration, tax, accounting, financial review and
                    documentation support.
                  </p>
                </article>
                <article className="grid gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-5 sm:py-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Our mission
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    Make tax compliance easier to understand and manage.
                  </p>
                </article>
                <article className="grid gap-2 py-5 sm:grid-cols-[8rem_1fr] sm:gap-5 sm:py-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Our vision
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    Build lasting relationships through reliable consultancy.
                  </p>
                </article>
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                Professionalism · Transparency · Accountability · Client focus ·
                Organized records · Careful data handling · Expert support
              </p>
            </div>

            <figure className="mt-7 grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-4 border-y border-border py-5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:py-6 lg:ml-[35%] lg:grid-cols-[minmax(0,1fr)_14rem] lg:pl-8">
              <div>
                <blockquote className="max-w-3xl text-lg font-medium leading-relaxed tracking-[-0.02em] text-primary sm:text-xl">
                  “Our goal is to make tax compliance the easiest part of
                  running your business.”
                </blockquote>
                <figcaption className="mt-3 text-sm font-semibold text-text-secondary">
                  Gajendra Kumar Sony{" "}
                  <span className="font-normal">— Founder</span>
                </figcaption>
              </div>
              <div className="khatu-watermark-slot relative h-28 sm:h-36 lg:h-48">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="devotional-watermark devotional-watermark-khatu"
                  height={260}
                  src="/assets/khatu-shyam-ji.jpg"
                  width={195}
                />
              </div>
            </figure>

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
                title="Services for tax, business and records."
              />
            </div>
          </div>
          {serviceGroups.map((group, index) => (
            <ServiceGroup group={group} index={index} key={group.id} />
          ))}
          <div className="border-t border-border bg-primary py-6 text-white">
            <div className="site-container flex justify-end">
              <a className="button button-light w-fit" href="#contact">
                Ask about a service
                <ArrowRight aria-hidden="true" className="icon" />
              </a>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="process-title"
          className="process-section scroll-target relative isolate overflow-hidden border-y border-border bg-background py-12 sm:py-16 lg:py-20"
          id="process"
        >
          <div className="site-container relative z-10">
            <div>
              <SectionHeading
                id="process-title"
                eyebrow="Our process"
                title="A clear five-step process."
              />
            </div>
            <ol className="process-timeline mt-8 grid gap-y-2 sm:grid-cols-2 sm:gap-x-8 lg:mt-10 lg:grid-cols-5 lg:gap-x-5">
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
          className="contact-section scroll-target bg-white py-12 sm:py-16 lg:py-20"
          id="contact"
        >
          <div className="site-container">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <SectionHeading
                  id="contact-title"
                  eyebrow="Contact"
                  title="Contact Global Tax Nepal."
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

              <div className="border border-border bg-background p-5 shadow-[0_24px_60px_-42px_rgba(23,43,77,0.45)] sm:p-8 lg:p-9">
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
            <p className="text-xs text-text-secondary">
              Developed by{" "}
              <a
                className="font-medium text-secondary underline underline-offset-2 transition-colors duration-200 ease-out hover:text-primary"
                href="https://anandkeshari.com.np"
                rel="noopener noreferrer"
                target="_blank"
              >
                Anand Keshari
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
