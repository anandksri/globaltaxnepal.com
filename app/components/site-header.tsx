"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About Us" },
  { href: "#services", label: "Services" },
  { href: "#process", label: "Our Process" },
  { href: "#contact", label: "Contact" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="site-container flex min-h-[4.5rem] items-center justify-between gap-4">
        <a
          aria-label="Global Tax Nepal home"
          className="flex min-w-0 shrink-0 items-center"
          href="#home"
          onClick={closeMenu}
        >
          <Image
            alt="Global Tax Nepal"
            className="h-8 w-auto shrink-0 sm:h-9"
            height={35}
            priority
            src="/assets/global-tax-nepal-logo.svg"
            width={200}
          />
        </a>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-5 lg:flex xl:gap-7"
        >
          {links.map(({ href, label }) => (
            <a
              className="whitespace-nowrap text-sm font-medium text-text-secondary transition-colors duration-200 ease-out hover:text-primary"
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </nav>

        <button
          aria-controls="mobile-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border text-primary transition-colors duration-200 ease-out hover:border-primary hover:bg-background lg:hidden"
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

      <nav
        aria-label="Mobile navigation"
        className={`border-t border-border bg-surface px-4 py-2 lg:hidden ${
          menuOpen ? "block" : "hidden"
        }`}
        id="mobile-navigation"
      >
        <div className="site-container flex flex-col">
          {links.map(({ href, label }) => (
            <a
              className="border-b border-border py-3 text-sm font-medium text-primary transition-colors duration-200 ease-out last:border-0 hover:text-secondary focus-visible:text-secondary"
              href={href}
              key={href}
              onClick={closeMenu}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
