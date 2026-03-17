"use client";

import Link from "next/link";

export interface PageHeaderProps {
  backHref: string;
  backLabel: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Detail page header: back link, title, optional subtitle, optional actions.
 * Uses analyst-pageHeader when actions are present, analyst-pageHeaderBlock when not.
 */
export default function PageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  const className = actions ? "analyst-pageHeader" : "analyst-pageHeaderBlock";
  return (
    <div className={className}>
      <div>
        <Link href={backHref} className="analyst-backLink">
          {backLabel}
        </Link>
        <h1 className="analyst-pageTitleInPage">{title}</h1>
        {subtitle != null && <p className="analyst-pageSubtitle">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
