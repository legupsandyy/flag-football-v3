import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth";
import SiteNav from "@/components/SiteNav";
import { SITE_NAME, SITE_SHORT } from "@/lib/site";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: "ATS, O/U, Survivor & DK Slates — one league, one roof.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F6B5C",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-ink font-sans text-ink2 antialiased">
        <SiteNav siteName={SITE_NAME} shortName={SITE_SHORT} userName={user?.name ?? null} />
        <main className="page-pad">{children}</main>
      </body>
    </html>
  );
}
