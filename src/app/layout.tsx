import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { Providers } from "@/components/Providers";
import { getRootLayoutBootstrap } from "@/lib/session";
import { RANGE_CLAMP_INLINE_SCRIPT } from "@/lib/rangeClampInlineScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grow Your Business",
  description: "AI-Powered Decision Support System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, session: sessionFromCookies, embedFrame } = await getRootLayoutBootstrap();
  const userEmailNav =
    process.env.DEV_AUTH_BYPASS === "1" ? "dev@local" : sessionFromCookies?.email ?? null;

  const mainClass = embedFrame
    ? "mx-auto w-full max-w-none p-0"
    : "mx-auto w-full max-w-6xl px-6 py-10";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Sync during HTML parse — beforeInteractive external script can still run too late. */}
        <script
          dangerouslySetInnerHTML={{
            __html: RANGE_CLAMP_INLINE_SCRIPT,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="flex min-h-dvh flex-col bg-[var(--background)] bg-grid-pattern text-[var(--foreground)]">
            <Nav userEmail={userEmailNav} suppressForEmbed={embedFrame} />
            <main
              className={`${mainClass} flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain`}
            >
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
