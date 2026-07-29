import type { Metadata } from "next";
import { Inria_Serif, Inter } from "next/font/google";
import { AuthGate } from "@/features/auth/AuthGate";
import { Providers } from "./providers";
import "./globals.css";

// NFR-07: Inria Serif for titles/headings, Inter for body/meta/UI text.
const inriaSerif = Inria_Serif({
  variable: "--font-inria-serif",
  subsets: ["latin"],
  weight: ["700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Notes",
  description: "A single-user notes app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inriaSerif.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          <AuthGate>{children}</AuthGate>
        </Providers>
      </body>
    </html>
  );
}
