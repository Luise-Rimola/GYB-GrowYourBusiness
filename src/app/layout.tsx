import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Nav from "@/components/Nav";
import { Providers } from "@/components/Providers";
import { getSessionSafe } from "@/lib/session";
import { getServerLocale } from "@/lib/locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grow Your Business",
  description: "AI-Powered Growth System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const session =
    process.env.DEV_AUTH_BYPASS === "1" ? { email: "dev@local" } : await getSessionSafe();
  const hdrs = await headers();
  const embedFrame = hdrs.get("x-app-embed") === "1";

  const mainClass = embedFrame
    ? "mx-auto w-full max-w-none p-0"
    : "mx-auto w-full max-w-6xl px-6 py-10";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="min-h-screen bg-[var(--background)] bg-grid-pattern text-[var(--foreground)]">
            <Nav userEmail={session?.email ?? null} />
            <main className={mainClass}>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
