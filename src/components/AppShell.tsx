"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useShortlist } from "@/lib/shortlist";
import {
  Building2,
  Columns3,
  FileSearch,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explorer", label: "GCC Explorer", icon: Building2 },
  { href: "/compare", label: "Location Compare", icon: Columns3 },
  { href: "/evidence", label: "Evidence Inspector", icon: FileSearch },
  { href: "/assistant", label: "AI Research Assistant", icon: MessageSquareText },
];

export interface Snapshot {
  asOf: string;
  companies: number;
  sources: number;
}

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md text-white"
      aria-label="GCC Atlas home"
    >
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="none" stroke="#159b92" strokeWidth="1.8" />
        <ellipse cx="16" cy="16" rx="6" ry="14" fill="none" stroke="#159b92" strokeWidth="1.4" />
        <path d="M2.5 16h27" stroke="#159b92" strokeWidth="1.4" />
        <circle cx="21.5" cy="10.5" r="2.6" fill="#e5822b" />
      </svg>
      <span className="font-display text-[1.15rem] font-semibold tracking-tight">
        GCC Atlas
      </span>
    </Link>
  );
}

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate?: () => void;
}) {
  const shortlist = useShortlist();
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          pathname !== null &&
          (href === "/" ? pathname === "/" : pathname.startsWith(href));
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[14.5px] transition-colors ${
                active
                  ? "bg-navy-800 font-medium text-white"
                  : "text-navy-200 hover:bg-navy-900 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                aria-hidden
                className={active ? "text-teal-500" : "text-navy-300 group-hover:text-teal-500"}
              />
              {label}
              {href === "/compare" && shortlist.ids.length > 0 ? (
                <span
                  className="tnum ml-auto rounded-full bg-teal-700 px-2 py-0.5 text-xs font-semibold text-white"
                  aria-label={`${shortlist.ids.length} cities shortlisted`}
                >
                  {shortlist.ids.length}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** usePathname needs a Suspense boundary under Cache Components. */
function ActiveNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavList pathname={pathname} onNavigate={onNavigate} />;
}

function SidebarBody({
  snapshot,
  onNavigate,
}: {
  snapshot: Snapshot;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Logo />
      </div>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3">
        <Suspense fallback={<NavList pathname={null} onNavigate={onNavigate} />}>
          <ActiveNav onNavigate={onNavigate} />
        </Suspense>
      </nav>
      <div className="m-3 rounded-md border border-navy-800 bg-navy-900 p-3.5 text-[13px] leading-snug text-navy-200">
        <p className="font-medium text-white">Static snapshot</p>
        <p className="mt-1">
          Data as of {snapshot.asOf}. {snapshot.companies} company records from{" "}
          {snapshot.sources} sources. No live feed.
        </p>
        <Link
          href="/evidence"
          onClick={onNavigate}
          className="mt-2 inline-block text-teal-200 underline decoration-teal-700 underline-offset-2 hover:text-white"
        >
          Check the evidence
        </Link>
      </div>
    </div>
  );
}

export function AppShell({
  snapshot,
  children,
}: {
  snapshot: Snapshot;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy-950 lg:block">
        <SidebarBody snapshot={snapshot} />
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between bg-navy-950 px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="rounded-md p-2 text-white hover:bg-navy-800"
        >
          <Menu size={22} aria-hidden />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-navy-950/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-navy-950">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 rounded-md p-2 text-navy-200 hover:bg-navy-800 hover:text-white"
            >
              <X size={20} aria-hidden />
            </button>
            <SidebarBody snapshot={snapshot} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <main
        id="main"
        className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:px-10 lg:py-10"
      >
        {children}
      </main>
    </div>
  );
}
