"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type EventTab = { href: string; label: string; exact?: boolean; locked?: boolean };

/** Link-based tabs for the event sub-pages (server-rendered pages, no client state). */
export function EventTabs({ tabs }: { tabs: EventTab[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4" aria-label="event sections">
      <ul className="inline-flex h-10 min-w-full items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
                  tab.locked && "opacity-60",
                )}
              >
                {tab.label}
                {tab.locked ? <span aria-hidden="true">🔒</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
