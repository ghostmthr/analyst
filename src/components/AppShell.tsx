"use client";

import Link from "next/link";

export type AppShellActiveNav =
  | "TARGETS"
  | "EVIDENCE"
  | "NETWORK"
  | "MAP"
  | "EVENTS"
  | "EXPORT/IMPORT"
  | "INTEGRITY SCAN";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

const NAV_ITEMS: { nav: AppShellActiveNav; hrefSegment: string }[] = [
  { nav: "TARGETS", hrefSegment: "targets" },
  { nav: "EVIDENCE", hrefSegment: "evidence" },
  { nav: "NETWORK", hrefSegment: "network" },
  { nav: "MAP", hrefSegment: "map" },
  { nav: "EVENTS", hrefSegment: "events" },
  { nav: "EXPORT/IMPORT", hrefSegment: "export" },
  { nav: "INTEGRITY SCAN", hrefSegment: "integrity" },
];

export interface AppShellProps {
  invId?: string;
  activeNav: AppShellActiveNav;
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
}

export default function AppShell({
  invId,
  activeNav,
  breadcrumbs,
  children,
}: AppShellProps) {
  const base = invId ? `/inv/${invId}` : "";

  return (
    <div className="analyst-app analyst-app--column">
      <header className="analyst-topbar">
        <span className="analyst-brand">ANALYST</span>
        <nav className="analyst-topnav">
          {NAV_ITEMS.map(({ nav, hrefSegment }) => {
            const href = `${base}/${hrefSegment}`;
            const isActive = activeNav === nav;
            return (
              <Link
                key={nav}
                href={href}
                className={`analyst-topnavItem ${isActive ? "analyst-topnavItemActive" : ""}`}
              >
                {nav}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="analyst-breadcrumbBar">
        <span className="analyst-breadcrumbSep">‹</span>
        {breadcrumbs.map((crumb, i) => (
          <span key={i}>
            {i > 0 && <span className="analyst-breadcrumbDivider">/</span>}
            {crumb.href != null ? (
              <Link
                href={crumb.href}
                className={crumb.active ? "analyst-breadcrumbActive" : "analyst-breadcrumbLink"}
              >
                {crumb.label.toUpperCase()}
              </Link>
            ) : (
              <span className={crumb.active ? "analyst-breadcrumbActive" : "analyst-breadcrumbLink"}>
                {crumb.label.toUpperCase()}
              </span>
            )}
          </span>
        ))}
      </div>

      <main className="analyst-page analyst-main">
        {children}
      </main>
    </div>
  );
}
