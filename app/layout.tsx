import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Global Tax Nepal",
    template: "%s | Global Tax Nepal",
  },
  description:
    "Professional tax and business consultancy, tax filing, business registration, financial review, documentation and compliance support.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
