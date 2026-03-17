"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect,useState } from "react";

import PageHeader from "@/components/PageHeader";
import { useCase } from "@/contexts/CaseContext";
import { displayEntityType } from "@/lib/labelRegistry";

import ClaimsTab from "./ClaimsTab";
import EventsTab from "./EventsTab";
import EvidenceTab from "./EvidenceTab";
import IdentifiersTab from "./IdentifiersTab";
import LinksTab from "./LinksTab";
import ProfileTab from "./ProfileTab";

type Tab = "profile" | "identifiers" | "evidence" | "claims" | "links" | "events";

/** Unified primary action button for tab sections (Add identifier, Add evidence, Add claim). */
function TabPrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="analyst-btnPrimary" onClick={onClick}>
      {children}
    </button>
  );
}

export default function TargetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;
  const entityId = params.entityId as string;
  const { caseFile, ingestEvidenceAndLink, updateEntity, deleteEntity, addEntityLocation, removeEntityLocation, updateEntityLocation, createIdentifier, updateIdentifier, deleteIdentifier, createClaim, updateClaim, deleteClaim, createRelationship, updateRelationship, deleteRelationship } = useCase();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(() => {
    if (tabFromUrl && ["profile", "identifiers", "evidence", "claims", "links", "events"].includes(tabFromUrl))
      return tabFromUrl;
    return "profile";
  });
  useEffect(() => {
    if (tabFromUrl && ["profile", "identifiers", "evidence", "claims", "links", "events"].includes(tabFromUrl))
      setTab(tabFromUrl);
  }, [tabFromUrl]);
  const [identifiersAddDrawerOpen, setIdentifiersAddDrawerOpen] = useState(false);
  const [evidenceAddDrawerOpen, setEvidenceAddDrawerOpen] = useState(false);
  const [evidenceLinkDrawerOpen, setEvidenceLinkDrawerOpen] = useState(false);
  const [claimsAddDrawerOpen, setClaimsAddDrawerOpen] = useState(false);
  const [linksAddDrawerOpen, setLinksAddDrawerOpen] = useState(false);

  const entity = caseFile?.entities.find((e) => e.id === entityId);
  const _inv = caseFile?.investigations.find((i) => i.id === invId);
  const identifiers = caseFile?.identifiers.filter((i) => i.entity_id === entityId) ?? [];
  const imageEvidence =
    caseFile?.evidence.filter(
      (e) => e.investigation_id === invId && e.type === "IMAGE"
    ) ?? [];
  const orgEntities =
    caseFile?.entities.filter(
      (e) => e.investigation_id === invId && e.type === "ORG"
    ) ?? [];
  const allEntitiesInv =
    caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [];
  const invEvidence = caseFile?.evidence.filter((e) => e.investigation_id === invId) ?? [];

  if (!caseFile) return <p>No case loaded.</p>;
  if (!entity) {
    return (
      <>
        <p>Target not found.</p>
        <Link href={`/inv/${invId}/targets`}>← Targets</Link>
      </>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "identifiers", label: "Identifiers" },
    { id: "evidence", label: "Evidence" },
    { id: "claims", label: "Claims" },
    { id: "links", label: "Links" },
    { id: "events", label: "Events" },
  ];

  const headerActions =
    tab === "identifiers" ? (
      <TabPrimaryButton onClick={() => setIdentifiersAddDrawerOpen(true)}>
        ADD IDENTIFIER
      </TabPrimaryButton>
    ) : tab === "evidence" ? (
      <div className="analyst-actionsRow">
        <TabPrimaryButton onClick={() => setEvidenceLinkDrawerOpen(true)}>
          LINK EXISTING
        </TabPrimaryButton>
        <TabPrimaryButton onClick={() => setEvidenceAddDrawerOpen(true)}>
          ADD EVIDENCE
        </TabPrimaryButton>
      </div>
    ) : tab === "claims" ? (
      <TabPrimaryButton onClick={() => setClaimsAddDrawerOpen(true)}>
        ADD CLAIM
      </TabPrimaryButton>
    ) : tab === "links" ? (
      <TabPrimaryButton onClick={() => setLinksAddDrawerOpen(true)}>
        ADD LINK
      </TabPrimaryButton>
    ) : tab === "events" ? (
      <Link
        href={`/inv/${invId}/events/new?entity=${entityId}&returnTo=target`}
        className="analyst-btnPrimary"
      >
        ADD EVENT
      </Link>
    ) : undefined;

  return (
    <>
      <PageHeader
        backHref={`/inv/${invId}/targets`}
        backLabel="← Targets"
        title={entity.name}
        subtitle={displayEntityType(entity.type)}
        actions={headerActions}
      />

      <nav className="analyst-tabRow">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            data-active={tab === id ? "true" : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "profile" && (
        <ProfileTab
          entity={entity}
          invId={invId}
          caseFile={caseFile}
          orgEntities={orgEntities}
          imageEvidence={imageEvidence}
          invEvidence={invEvidence}
          onUpdate={updateEntity}
          onDelete={deleteEntity}
          onAddLocation={addEntityLocation}
          onRemoveLocation={removeEntityLocation}
          onUpdateLocation={updateEntityLocation}
          onNavigateBack={() => router.push(`/inv/${invId}/targets`)}
        />
      )}
      {tab === "identifiers" && (
        <IdentifiersTab
          entityId={entityId}
          invId={invId}
          identifiers={identifiers}
          addDrawerOpen={identifiersAddDrawerOpen}
          onCloseAddDrawer={() => setIdentifiersAddDrawerOpen(false)}
          onCreate={createIdentifier}
          onUpdate={updateIdentifier}
          onDelete={deleteIdentifier}
        />
      )}
      {tab === "evidence" && (
        <EvidenceTab
          entity={entity}
          entityId={entityId}
          invId={invId}
          caseFile={caseFile}
          onUpdateEntity={updateEntity}
          onIngestAndLink={ingestEvidenceAndLink}
          addDrawerOpen={evidenceAddDrawerOpen}
          linkDrawerOpen={evidenceLinkDrawerOpen}
          onCloseAddDrawer={() => setEvidenceAddDrawerOpen(false)}
          onCloseLinkDrawer={() => setEvidenceLinkDrawerOpen(false)}
        />
      )}
      {tab === "claims" && (
        <ClaimsTab
          entityId={entityId}
          invId={invId}
          caseFile={caseFile}
          invEvidence={invEvidence}
          addDrawerOpen={claimsAddDrawerOpen}
          onCloseAddDrawer={() => setClaimsAddDrawerOpen(false)}
          onCreate={createClaim}
          onUpdate={updateClaim}
          onDelete={deleteClaim}
        />
      )}
      {tab === "links" && (
        <LinksTab
          entityId={entityId}
          invId={invId}
          caseFile={caseFile}
          allEntities={allEntitiesInv}
          invEvidence={invEvidence}
          addDrawerOpen={linksAddDrawerOpen}
          onCloseAddDrawer={() => setLinksAddDrawerOpen(false)}
          onCreate={createRelationship}
          onUpdate={updateRelationship}
          onDelete={deleteRelationship}
        />
      )}
      {tab === "events" && (
        <EventsTab entityId={entityId} invId={invId} caseFile={caseFile} invEntities={allEntitiesInv.map((e) => ({ id: e.id, name: e.name }))} />
      )}
    </>
  );
}
