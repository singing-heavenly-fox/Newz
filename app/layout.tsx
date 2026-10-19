import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAnalyzedCount } from "@/lib/data/articles";
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
    default: "Newz — AI-estimated news sentiment & framing",
    template: "%s · Newz",
  },
  description:
    "Real news articles with reader-friendly AI-estimated sentiment and political framing insights.",
  icons: { icon: "/logo.svg", apple: "/logo.svg" },
};

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Live header count; null hides behind "Analysis offline" instead of
  // crashing the whole layout if the DB read fails.
  let analyzedCount: number | null = null;
  try {
    analyzedCount = await getAnalyzedCount();
  } catch {
    analyzedCount = null;
  }
  const body = (
    <body className="min-h-full flex flex-col">
      <SiteHeader analyzedCount={analyzedCount} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </body>
  );

  if (!hasClerkKey) {
    console.warn("[Newz] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY missing — rendering without ClerkProvider.");
    return (
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        {body}
      </html>
    );
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <ClerkProvider>{body}</ClerkProvider>
    </html>
  );
}
