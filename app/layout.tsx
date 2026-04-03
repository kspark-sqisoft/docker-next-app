import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PageTitleHeading } from "@/components/page-title-heading";
import { Providers } from "@/components/providers";
import { SiteHeaderBar } from "@/components/site-header-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Notice Board",
    template: "%s · Notice Board",
  },
  description:
    "학습용 게시판 — Next.js, Prisma, PostgreSQL, Docker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <Providers>
          <div className="bg-background min-h-svh">
            <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
              <div className="mx-auto h-12 max-w-2xl px-3 sm:h-[3.25rem] sm:px-4">
                <div className="flex h-full items-center">
                  <SiteHeaderBar />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-2xl px-3 pb-8 pt-3 sm:px-4 sm:pb-10 sm:pt-4 md:pt-5">
              <PageTitleHeading />
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
