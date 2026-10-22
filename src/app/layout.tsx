import type { Metadata, Viewport } from "next";
import { Inter, Mukta_Malar, Space_Grotesk } from "next/font/google";
import { CopyProvider } from "@/components/copy";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const tamil = Mukta_Malar({ subsets: ["tamil", "latin"], weight: ["400", "700", "800"], variable: "--font-tamil", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Bachelors Virundhu — Tickets", template: "%s · Bachelors Virundhu" },
  description: "Kovai's biggest bachelor party. Grab your tickets — QR straight to your phone and inbox.",
};

export const viewport: Viewport = { themeColor: "#07070c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${space.variable} ${inter.variable} ${tamil.variable}`}>
      <body className="min-h-dvh antialiased">
        <CopyProvider>
          <div className="pointer-events-none fixed inset-0 -z-10 bg-grid" />
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6">{children}</main>
          <SiteFooter />
        </CopyProvider>
      </body>
    </html>
  );
}
