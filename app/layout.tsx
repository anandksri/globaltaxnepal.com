import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { FormPlaceholders } from "./components/form-placeholders";
import { RegisterServiceWorker } from "./components/register-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Global Tax Nepal",
    template: "%s | Global Tax Nepal",
  },
  description:
    "Professional tax and business consultancy, tax filing, business registration, financial review, documentation and compliance support.",
  appleWebApp: {
    capable: true,
    title: "Global Tax Nepal",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = { themeColor: "#1c4d72" };

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
        <FormPlaceholders />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
