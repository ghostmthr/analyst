"use client";

import EventsTable from "@/components/EventsTable";
import type { CaseFile } from "@/types";

export interface EventsTabProps {
  entityId: string;
  invId: string;
  caseFile: CaseFile;
  invEntities: { id: string; name: string }[];
}

export default function EventsTab({
  entityId,
  invId,
  caseFile,
  invEntities,
}: EventsTabProps) {
  const events = (caseFile.events ?? []).filter(
    (e) => e.investigation_id === invId && (e.entity_ids ?? []).includes(entityId)
  );
  const sortedEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ marginTop: 16 }}>
      <EventsTable
        events={sortedEvents}
        invId={invId}
        invEntities={invEntities}
        caseFile={caseFile}
        variant="targetProfile"
        emptyMessage="No events linked to this target."
      />
    </div>
  );
}
