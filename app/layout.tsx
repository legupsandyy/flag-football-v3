import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Postseason Tournament",
  description: "ATS, O/U, Survivor & DK Slates — one league, one roof.",
};

const NAV = [
  { href: "/survivor", label: "Survivor" },
  { href: "/ats", label: "ATS Pick'em" },
  { href: "/ou", label: "O/U Pick'em" },
  { href: "/dk-slates", label: "DK Slates" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-ink2 font-sans">
        <header className="row-line px-5 py-3 flex items-center justify-between bg-panel">
          <Link href="/" className="font-display text-sm font-mono tracking-wide">
            postseason/
          </Link>
          <nav className="flex gap-4 text-xs uppercase tracking-wide text-black/50 font-mono">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-turf transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="text-xs text-black/40 font-mono">
            {user ? user.name : <Link href="/login" className="text-turf">sign_in</Link>}
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
