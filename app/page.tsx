import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  FileCheck2,
  GraduationCap,
} from "lucide-react";
import { SiteHeader } from "./components/site-header";

export const metadata: Metadata = {
  title: "Tax & Business Consultancy",
  description:
    "Global Tax Nepal provides tax and business consultancy, registration, accounting, documentation, compliance, and professional training services.",
};

const principles = [
  {
    number: "01",
    title: "Professional support",
    description:
      "A considered, respectful approach to your tax and business requirements.",
  },
  {
    number: "02",
    title: "Organized processes",
    description:
      "Clear steps help you understand what is needed and what comes next.",
  },
  {
    number: "03",
    title: "Transparent communication",
    description:
      "Straightforward conversations keep expectations and requirements aligned.",
  },
  {
    number: "04",
    title: "Client-focused service",
    description:
      "Support begins with understanding your circumstances and priorities.",
  },
];

const process = [
  {
    number: "01",
    title: "Consultation",
    description: "Start a conversation about the support you are looking for.",
  },
  {
    number: "02",
    title: "Requirement understanding",
    description: "Discuss your needs, context and relevant requirements.",
  },
  {
    number: "03",
    title: "Service processing",
    description: "Work through the agreed service steps in an organized way.",
  },
  {
    number: "04",
    title: "Completion and delivery",
    description: "Receive the completed work and any relevant next steps.",
  },
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

function ServiceList({
  id,
  number,
  title,
  description,
  items,
  icon: Icon,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  items: string[];
  icon: typeof FileCheck2;
}) {
  return (
    <article className="service-editorial border-t border-border pt-6" id={id}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-secondary">
            {number}
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-primary sm:text-2xl">
            {title}
          </h3>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-secondary">
          <Icon aria-hidden="true" className="icon" />
        </span>
      </div>
      <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
        {description}
      </p>
      <ul className="mt-6 grid gap-x-6 border-t border-border sm:grid-cols-2">
        {items.map((item) => (
          <li
            className="border-b border-border py-3 text-sm text-text"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </article>
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
          className="hero-section relative overflow-hidden border-b border-border"
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
                Your trusted partner for tax consultancy, business services and
                professional support. We help individuals and businesses manage
                compliance and move forward with confidence.
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
                  href="#tax"
                >
                  Tax Consultancy
                  <ArrowUpRight
                    aria-hidden="true"
                    className="icon text-secondary transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
                <a
                  className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-secondary"
                  href="#business"
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
                  A professional setting for business support
                </p>
              </div>
              <figcaption className="grid grid-cols-2 border border-t-0 border-border bg-surface">
                <a
                  className="group flex min-h-16 items-center justify-between gap-2 border-r border-border px-4 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:bg-background sm:px-5"
                  href="#tax"
                >
                  Tax Consultancy
                  <ArrowRight
                    aria-hidden="true"
                    className="icon text-secondary transition-transform duration-200 ease-out group-hover:translate-x-1"
                  />
                </a>
                <a
                  className="group flex min-h-16 items-center justify-between gap-2 px-4 text-sm font-medium text-primary transition-colors duration-200 ease-out hover:bg-background sm:px-5"
                  href="#business"
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
          aria-labelledby="about-title"
          className="about-section relative isolate overflow-hidden bg-surface py-16 sm:py-20 lg:py-24"
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
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
              <div className="max-w-xl">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                  About Global Tax Nepal
                </p>
                <h2
                  className="text-page-title font-semibold leading-[1.12] tracking-[-0.04em] text-primary"
                  id="about-title"
                >
                  Supporting Businesses. Simplifying Compliance.
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
                Global Tax Nepal provides professional tax and business
                consultancy services, helping individuals, entrepreneurs and
                organizations manage documentation, registration, accounting
                and compliance requirements.
              </p>
            </div>

            <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <figure className="relative min-h-64 overflow-hidden bg-[#d9dce1] sm:min-h-80 lg:min-h-[25rem]">
                <Image
                  alt="Two professionals discussing documents during a business consultation"
                  className="h-full w-full object-cover"
                  fill
                  sizes="(max-width: 1023px) 100vw, 42vw"
                  src="/assets/business-consultation.jpg"
                />
                <figcaption className="absolute bottom-0 left-0 bg-surface px-4 py-3 text-xs font-medium text-primary sm:px-5">
                  Clear conversations. Organized support.
                </figcaption>
              </figure>

              <div className="about-principles">
                <article className="grid gap-2 border-t border-border py-5 sm:grid-cols-[7rem_1fr] sm:gap-5 sm:py-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Our purpose
                  </p>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    Helping businesses and individuals navigate tax and
                    business requirements through organized consultancy
                    services.
                  </p>
                </article>
                <article className="grid gap-2 border-t border-border py-5 sm:grid-cols-[7rem_1fr] sm:gap-5 sm:py-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Our approach
                  </p>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    Understanding client requirements and providing structured
                    support throughout the consultancy process.
                  </p>
                </article>
                <article className="grid gap-2 border-y border-border py-5 sm:grid-cols-[7rem_1fr] sm:gap-5 sm:py-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Our commitment
                  </p>
                  <p className="max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
                    Maintaining professional communication, organized
                    documentation and client-focused service.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="services-title"
          className="services-section border-y border-border bg-background py-16 sm:py-20 lg:py-24"
          id="services"
        >
          <div className="site-container">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.65fr] lg:items-end lg:gap-16">
              <SectionHeading
                id="services-title"
                eyebrow="Our services"
                title="Practical guidance for essential business needs."
              />
              <p className="max-w-lg pb-1 text-sm leading-6 text-text-secondary sm:text-base">
                Support for the registrations, records and documentation that
                help individuals and businesses meet their requirements.
              </p>
            </div>

            <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-2 lg:gap-14">
              <ServiceList
                description="Structured support with tax registration, clearance and financial records."
                icon={FileCheck2}
                id="tax"
                items={[
                  "PAN registration",
                  "VAT registration",
                  "Tax clearance",
                  "Accounting and bookkeeping",
                ]}
                number="01 / TAX"
                title="Tax Consultancy"
              />
              <ServiceList
                description="Guidance for business setup, compliance documentation and ongoing requirements."
                icon={BriefcaseBusiness}
                id="business"
                items={[
                  "Company registration",
                  "OCR services",
                  "Business consultancy",
                  "Business documentation and compliance",
                  "Professional training",
                ]}
                number="02 / BUSINESS"
                title="Business Consultancy"
              />
            </div>

            <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between lg:mt-14">
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-secondary">
                  <GraduationCap aria-hidden="true" className="icon" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-primary">
                    Professional training
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-text-secondary">
                    Training support as part of Global Tax Nepal&apos;s
                    consultancy services.
                  </p>
                </div>
              </div>
              <a
                className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href="#contact"
              >
                Ask about our services
                <ArrowRight
                  aria-hidden="true"
                  className="icon transition-transform duration-200 ease-out group-hover:translate-x-1"
                />
              </a>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="approach-title"
          className="relative isolate overflow-hidden bg-surface py-16 sm:py-20 lg:py-24"
          id="approach"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="devotional-watermark devotional-watermark-ganesh"
            height={667}
            src="/assets/shri-ganesh-ji.jpg"
            width={500}
          />
          <div className="site-container relative z-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <SectionHeading
                id="approach-title"
                eyebrow="How we support you"
                title="A clear, considered way to work together."
                description="Professional support starts with understanding what matters to you and making each step easier to follow."
              />
              <div className="grid gap-x-8 sm:grid-cols-2">
                {principles.map((principle) => (
                  <article
                    className="border-t border-border py-5 sm:py-6"
                    key={principle.number}
                  >
                    <p className="text-xs font-medium tracking-[0.12em] text-secondary">
                      {principle.number}
                    </p>
                    <h3 className="mt-3 text-base font-semibold text-primary">
                      {principle.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {principle.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="process-title"
          className="process-section border-y border-border bg-background py-16 sm:py-20 lg:py-24"
          id="process"
        >
          <div className="site-container">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
              <SectionHeading
                id="process-title"
                eyebrow="Our process"
                title="From first conversation to completion."
              />
              <p className="max-w-xl pb-1 text-sm leading-6 text-text-secondary sm:text-base">
                We keep the work understandable by moving through the
                requirements one step at a time.
              </p>
            </div>
            <ol className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
              {process.map((step) => (
                <li
                  className="border-t border-border py-5 sm:py-6"
                  key={step.number}
                >
                  <span className="text-xs font-medium tracking-[0.12em] text-secondary">
                    STEP {step.number}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="contact-title"
          className="contact-section bg-primary py-14 text-white sm:py-16 lg:py-20"
          id="contact"
        >
          <div className="site-container flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8fc8c0]">
                Start a conversation
              </p>
              <h2
                className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl"
                id="contact-title"
              >
                Let&apos;s understand what support you need.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Get in touch with Global Tax Nepal to discuss your next step.
              </p>
            </div>
            <a
              className="button w-fit border border-white/35 bg-transparent text-white hover:bg-white/10"
              href="#contact-details"
            >
              Get Consultation
              <ArrowRight aria-hidden="true" className="icon" />
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 bg-surface" id="footer">
        <div className="site-container grid gap-10 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:py-14">
          <div>
            <a
              className="text-base font-semibold tracking-wide text-primary"
              href="#home"
            >
              Global Tax Nepal
            </a>
            <p className="mt-3 max-w-sm text-sm leading-6 text-text-secondary">
              Tax and business consultancy for individuals, entrepreneurs and
              organizations.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">Explore</h2>
            <nav
              aria-label="Footer navigation"
              className="mt-3 flex flex-col gap-2"
            >
              <a
                className="w-fit text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href="#about"
              >
                About Us
              </a>
              <a
                className="w-fit text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href="#services"
              >
                Services
              </a>
              <a
                className="w-fit text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href="#process"
              >
                Our Process
              </a>
              <a
                className="w-fit text-sm text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href="#contact"
              >
                Contact
              </a>
            </nav>
          </div>
          <div id="contact-details">
            <h2 className="text-sm font-semibold text-primary">Contact</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Contact details will be provided by Global Tax Nepal.
            </p>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="site-container flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-secondary">
              © {new Date().getFullYear()} Global Tax Nepal. All rights reserved.
            </p>
            <p className="text-[0.65rem] leading-5 text-text-secondary">
              Khatu Shyam Ji by AdityaSharma92 · Shri Ganesh Ji by Shoot
              stufz. Both images are{" "}
              <a
                className="underline underline-offset-2"
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                rel="noreferrer"
                target="_blank"
              >
                CC BY-SA 4.0
              </a>{" "}
              and displayed in grayscale at 5% opacity.{" "}
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
