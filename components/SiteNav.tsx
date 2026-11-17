"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Target, ArrowUpDown, Coins, Home } from "lucide-react";
import Logo from "./Logo";

const ITEMS = [
  { href: "/survivor", label: "Survivor", short: "Survivor", icon: Flame },
  { href: "/ats", label: "ATS Pick'em", short: "ATS", icon: Target },
  { href: "/ou", label: "O/U Pick'em", short: "O/U", icon: ArrowUpDown },
  { href: "/dk-slates", label: "DK Slates", short: "DK", icon: Coins },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

export default function SiteNav({
  siteName,
  shortName,
  userName,
}: {
  siteName: string;
  shortName: string;
  userName: string | null;
}) {
  const path = usePathname() ?? "/";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-grid bg-panel/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-4 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Logo size={30} />
            <span className="truncate font-display text-[15px]" title={siteName}>
              {shortName}
            </span>
          </Link>

          <nav className="ml-auto hidden h-full items-stretch gap-1 sm:flex">
            {ITEMS.map((n) => {
              const active = isActive(path, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center whitespace-nowrap border-b-2 px-3 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                    active ? "border-turf text-turf" : "border-transparent text-black/50 hover:text-ink2"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto shrink-0 sm:ml-2">
            {userName ? (
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-amber/15 font-mono text-xs font-semibold text-amber">
                  {userName.trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[110px] truncate text-sm text-black/60 md:inline">{userName}</span>
              </div>
            ) : (
              <Link
                href="/login"
                className="border border-turf px-3 py-1.5 font-mono text-xs text-turf transition-colors hover:bg-turf hover:text-white"
              >
                join
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Phone tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-grid bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-5">
          {[{ href: "/", short: "Home", icon: Home }, ...ITEMS].map((n) => {
            const active = n.href === "/" ? path === "/" : isActive(path, n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 font-mono text-[10px] uppercase tracking-wide ${
                  active ? "text-turf" : "text-black/40"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                {n.short}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
