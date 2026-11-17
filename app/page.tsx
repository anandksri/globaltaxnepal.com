import type { Metadata } from "next";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "./components/site-header";

export const metadata: Metadata = {
  title: "Tax, Business & Cybersecurity Consultancy",
  description:
    "Global Tax Nepal provides tax consultancy, business consultancy, and cybersecurity services for individuals and organizations.",
};

const services = [
  {
    id: "tax",
    number: "01",
    title: "Tax Consultancy",
    description:
      "Practical support for tax registration, compliance and day-to-day financial records.",
    icon: FileCheck2,
    items: [
      "PAN registration",
      "VAT registration",
      "Tax clearance",
      "Accounting and bookkeeping",
    ],
  },
  {
    id: "business",
    number: "02",
    title: "Business Consultancy",
    description:
      "Guidance with business setup, documentation and administrative requirements.",
    icon: BriefcaseBusiness,
    items: [
      "Company registration",
      "OCR services",
      "Business documentation",
      "Business support",
    ],
  },
  {
    id: "cybersecurity",
    number: "03",
    title: "Cybersecurity Consultancy",
    description:
      "Security-focused services to help organizations understand and improve their digital risk posture.",
    icon: ShieldCheck,
    items: [
      "Vulnerability assessment",
      "Penetration testing",
      "Security audits",
      "Cybersecurity awareness",
      "Security consulting",
    ],
  },
];

const principles = [
  {
    number: "01",
    title: "Professional support",
    description:
      "A considered, respectful approach to your tax, business and security needs.",
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
      "Straightforward conversations help keep expectations and requirements aligned.",
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

function ServiceSection({
  service,
}: {
  service: (typeof services)[number];
}) {
  const Icon = service.icon;

  return (
    <article
      className="flex h-full flex-col border border-border bg-surface p-6 sm:p-7"
      id={service.id}
    >
      <div className="mb-8 flex items-center justify-between">
        <span className="flex size-11 items-center justify-center rounded-md bg-background text-secondary">
          <Icon aria-hidden="true" className="icon" />
        </span>
        <span className="text-xs font-medium tracking-[0.12em] text-text-secondary">
          {service.number}
        </span>
      </div>
      <h3 className="text-xl font-semibold tracking-[-0.02em] text-primary">
        {service.title}
      </h3>
      <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-text-secondary">
        {service.description}
      </p>
      <ul className="mt-6 border-t border-border">
        {service.items.map((item) => (
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
          className="relative overflow-hidden border-b border-border"
          id="home"
        >
          <div className="site-container grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                Tax · Business · Cybersecurity
              </p>
              <h1
                className="max-w-[13ch] text-display font-semibold leading-[1.08] tracking-[-0.045em] text-primary sm:max-w-[18ch]"
                id="hero-title"
              >
                Building Trust. Protecting Business. Enabling Growth.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
                Your trusted partner for tax consultancy, business services and
                cybersecurity solutions. We help individuals and organizations
                manage compliance, strengthen security and move forward with
                confidence.
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
            </div>

            <aside
              aria-label="Our three areas of consultancy"
              className="relative overflow-hidden rounded-lg bg-primary p-6 text-white sm:p-9"
            >
              <div className="mb-8 flex items-end justify-between border-b border-white/20 pb-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/65">
                    Our areas of support
                  </p>
                  <h2 className="mt-2 text-xl font-medium tracking-[-0.02em] sm:text-2xl">
                    One considered approach.
                  </h2>
                </div>
                <span aria-hidden="true" className="text-5xl font-light leading-none text-highlight">
                  03
                </span>
              </div>
              <ul className="divide-y divide-white/20">
                {services.map(({ id, number, title, icon: Icon }) => (
                  <li key={id}>
                    <a
                      className="group flex items-center gap-4 py-5 transition-colors duration-200 ease-out hover:text-white/75"
                      href={`#${id}`}
                    >
                      <span className="w-7 text-xs tracking-wide text-white/55">
                        {number}
                      </span>
                      <span className="flex size-10 items-center justify-center rounded-md border border-white/20 text-[#8fc8c0]">
                        <Icon aria-hidden="true" className="icon" />
                      </span>
                      <span className="flex-1 text-base font-medium sm:text-lg">
                        {title}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="icon text-white/55 transition-transform duration-200 ease-out group-hover:translate-x-1"
                      />
                    </a>
                  </li>
                ))}
              </ul>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -right-14 size-48 rounded-full border border-white/10"
              />
            </aside>
          </div>
        </section>

        <section
          aria-labelledby="about-title"
          className="bg-surface py-16 sm:py-20"
          id="about"
        >
          <div className="site-container grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <SectionHeading
              id="about-title"
              eyebrow="About Global Tax Nepal"
              title="Support for the work behind every growing organization."
            />
            <div className="max-w-2xl">
              <p className="text-lg leading-8 text-text">
                Global Tax Nepal brings together tax consultancy, business
                consultancy and cybersecurity consultancy in one professional
                service platform.
              </p>
              <p className="mt-4 text-base leading-7 text-text-secondary">
                From administrative and compliance needs to business
                documentation and digital security, we aim to make the next
                step clearer for individuals and organizations.
              </p>
              <a
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-secondary transition-colors duration-200 ease-out hover:text-primary"
                href="#services"
              >
                See how we can support you
                <ArrowRight aria-hidden="true" className="icon" />
              </a>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="services-title"
          className="border-y border-border bg-background py-16 sm:py-20"
          id="services"
        >
          <div className="site-container">
            <SectionHeading
              id="services-title"
              eyebrow="What we do"
              title="Three areas of professional support."
              description="Explore the consultancy services that Global Tax Nepal brings together for individuals and organizations."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceSection key={service.id} service={service} />
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="why-title"
          className="bg-surface py-16 sm:py-20"
          id="approach"
        >
          <div className="site-container">
            <SectionHeading
              id="why-title"
              eyebrow="Why Global Tax Nepal"
              title="A clear, considered way to work together."
              description="Professional support starts with understanding what matters to you and making each step easier to follow."
            />
            <div className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
              {principles.map((principle) => (
                <article
                  className="border-t border-border py-5 sm:py-6"
                  key={principle.number}
                >
                  <p className="text-xs font-medium tracking-[0.12em] text-secondary">
                    {principle.number}
                  </p>
                  <h3 className="mt-4 text-base font-semibold text-primary">
                    {principle.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {principle.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="process-title"
          className="border-y border-border bg-background py-16 sm:py-20"
          id="process"
        >
          <div className="site-container">
            <SectionHeading
              id="process-title"
              eyebrow="How we work"
              title="A straightforward process, from first conversation to delivery."
              centered
            />
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {process.map((step) => (
                <li className="border-t border-border pt-5" key={step.number}>
                  <span className="text-xs font-medium tracking-[0.12em] text-secondary">
                    STEP {step.number}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-primary">
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
          className="bg-primary py-14 text-white sm:py-16"
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
              <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">
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

      <footer className="bg-surface" id="footer">
        <div className="site-container grid gap-10 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:py-14">
          <div>
            <a
              className="text-base font-semibold tracking-wide text-primary"
              href="#home"
            >
              Global Tax Nepal
            </a>
            <p className="mt-3 max-w-sm text-sm leading-6 text-text-secondary">
              Tax, business and cybersecurity consultancy for individuals and
              organizations.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">Explore</h2>
            <nav aria-label="Footer navigation" className="mt-3 flex flex-col gap-2">
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
          <div className="site-container py-4">
            <p className="text-xs text-text-secondary">
              © {new Date().getFullYear()} Global Tax Nepal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
