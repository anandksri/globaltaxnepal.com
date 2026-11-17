"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About Us" },
  { href: "#services", label: "Services" },
  { href: "#cybersecurity", label: "Cybersecurity" },
  { href: "#contact", label: "Contact" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="site-container flex min-h-[4.5rem] items-center justify-between gap-2 sm:gap-6">
        <a
          aria-label="Global Tax Nepal home"
          className="flex min-w-0 items-center gap-2 sm:gap-3"
          href="#home"
          onClick={closeMenu}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold tracking-tight text-white sm:size-10">
            GT
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[0.8rem] font-semibold tracking-wide text-primary min-[24rem]:text-sm sm:text-base">
              Global Tax Nepal
            </span>
            <span className="mt-1 hidden whitespace-nowrap text-[0.65rem] font-medium uppercase tracking-[0.16em] text-text-secondary min-[24rem]:inline">
              Consultancy &amp; Technology
            </span>
          </span>
        </a>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
          {links.map(({ href, label }) => (
            <a
              className="text-sm font-medium text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
          <a className="button button-primary min-h-10 px-4" href="#contact">
            Get Consultation
          </a>
        </nav>

        <button
          aria-controls="mobile-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border text-primary transition-colors duration-200 ease-out hover:bg-background lg:hidden"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
          type="button"
        >
          {menuOpen ? (
            <X aria-hidden="true" className="icon" />
          ) : (
            <Menu aria-hidden="true" className="icon" />
          )}
        </button>
      </div>

      {menuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-border bg-surface px-4 py-3 lg:hidden"
          id="mobile-navigation"
        >
          <div className="site-container flex flex-col">
            {links.map(({ href, label }) => (
              <a
                className="border-b border-border py-3 text-sm font-medium text-text-secondary transition-colors duration-200 ease-out last:border-0 hover:text-primary"
                href={href}
                key={href}
                onClick={closeMenu}
              >
                {label}
              </a>
            ))}
            <a
              className="button button-primary mt-3 w-full"
              href="#contact"
              onClick={closeMenu}
            >
              Get Consultation
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
