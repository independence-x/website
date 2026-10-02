import type { Metadata } from "next";
import { Barlow_Condensed, Outfit } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { company } from "@/lib/content";
import { asset, basePath } from "@/lib/paths";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    basePath ? `https://independence-x.github.io${basePath}/` : "http://localhost:3000",
  ),
  title: {
    default: `${company.name.toUpperCase()} - HOME`,
    template: `%s - ${company.name.toUpperCase()}`,
  },
  description: company.tagline,
  openGraph: {
    siteName: company.name.toUpperCase(),
    title: company.name.toUpperCase(),
    description: company.tagline,
    images: [asset("/media/mercap-brochure.png")],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
