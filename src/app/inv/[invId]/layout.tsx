"use client";

import { useParams, usePathname } from "next/navigation";

import AppShell, { type AppShellActiveNav, type BreadcrumbItem } from "@/components/AppShell";
import { useCase } from "@/contexts/CaseContext";

function getShellFromPath(
  pathname: string,
  invId: string,
  caseTitle: string,
  entityNameById?: (id: string) => string | undefined
): { activeNav: AppShellActiveNav; breadcrumbs: BreadcrumbItem[] } {
  const base = `/inv/${invId}`;
  const withoutBase = pathname.slice(base.length) || "/";
  const segments = withoutBase.split("/").filter(Boolean);

  const firstSegment = segments[0] ?? "";
  const secondSegment = segments[1];

  const sectionLabels: Record<string, string> = {
    targets: "TARGETS",
    evidence: "EVIDENCE",
    network: "NETWORK",
    map: "MAP",
    events: "EVENTS",
    export: "EXPORT/IMPORT",
    integrity: "INTEGRITY SCAN",
    assessment: "ASSESSMENT",
    patches: "PATCHES",
  };

  const navBySegment: Record<string, AppShellActiveNav> = {
    targets: "TARGETS",
    evidence: "EVIDENCE",
    network: "NETWORK",
    map: "MAP",
    events: "EVENTS",
    export: "EXPORT/IMPORT",
    integrity: "INTEGRITY SCAN",
  };

  const activeNav: AppShellActiveNav = navBySegment[firstSegment] ?? "TARGETS";

  const crumbs: BreadcrumbItem[] = [
    { label: "INVESTIGATIONS", href: "/", active: false },
    { label: (caseTitle || "CASE").toUpperCase(), href: "/", active: false },
  ];

  const sectionLabel = sectionLabels[firstSegment];
  if (sectionLabel) {
    const sectionHref = `${base}/${firstSegment}`;
    if (!secondSegment) {
      crumbs.push({ label: sectionLabel, href: sectionHref, active: true });
    } else {
      crumbs.push({ label: sectionLabel, href: sectionHref, active: false });

      const subtabLabels: Record<string, string> = {
        new: firstSegment === "targets" ? "NEW TARGET" : firstSegment === "evidence" ? "NEW EVIDENCE" : firstSegment === "events" ? "NEW EVENT" : firstSegment === "assessment" ? "NEW GROUP" : "NEW",
        preview: "PREVIEW",
        summary: "SUMMARY",
        ach: "ACH",
      };

      let subtabLabel: string;
      if (firstSegment === "targets" && secondSegment && secondSegment !== "new" && entityNameById) {
        subtabLabel = entityNameById(secondSegment) ?? secondSegment;
      } else if (firstSegment === "assessment" && secondSegment && !["new", "summary", "ach"].includes(secondSegment)) {
        subtabLabel = "HYPOTHESES";
      } else if (firstSegment === "events" && secondSegment && secondSegment !== "new") {
        subtabLabel = "EVENT";
      } else if (firstSegment === "evidence" && secondSegment && secondSegment !== "new") {
        subtabLabel = "EVIDENCE";
      } else {
        subtabLabel = subtabLabels[secondSegment] ?? secondSegment.toUpperCase();
      }

      crumbs.push({
        label: subtabLabel,
        href: undefined,
        active: true,
      });
    }
  } else {
    crumbs.push({ label: "OVERVIEW", href: base, active: true });
  }

  return { activeNav, breadcrumbs: crumbs };
}

export default function InvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const invId = (params.invId as string) ?? "";
  const { caseFile } = useCase();

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const caseTitle = caseFile?.case?.title ?? inv?.title ?? "CASE";
  const entityNameById = caseFile
    ? (id: string) => caseFile.entities.find((e) => e.id === id)?.name
    : undefined;

  const isPreview = pathname?.includes("/export/preview") ?? false;
  if (isPreview) {
    return <>{children}</>;
  }

  const { activeNav, breadcrumbs } = getShellFromPath(
    pathname ?? "",
    invId,
    caseTitle,
    entityNameById
  );

  return (
    <AppShell
      invId={invId}
      activeNav={activeNav}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </AppShell>
  );
}
