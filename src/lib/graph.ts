/**
 * Graph helpers for Cytoscape network view.
 * Investigation-scoped; read-only from case file.
 */

import { isAssertionEvidenceBacked } from "@/lib/derived";
import { displayLinkType } from "@/lib/labelRegistry";
import type { CaseFile } from "@/types";
import type { RelationshipType } from "@/types";

const DEFAULT_MAX_NODES = 200;
const DEFAULT_MAX_EDGES = 400;

export interface GetSubgraphParams {
  seedEntityId: string;
  hops: 1 | 2;
  relationshipTypes?: RelationshipType[];
  minConfidenceScore?: number;
  evidenceBackedOnly?: boolean;
  maxNodes?: number;
  maxEdges?: number;
}

export interface SubgraphResult {
  entityIds: string[];
  relationshipIds: string[];
  capped: boolean;
}

/**
 * Get entity and relationship IDs for the subgraph.
 * Deterministic: sort IDs before capping.
 */
export function getSubgraph(
  caseFile: CaseFile,
  invId: string,
  params: GetSubgraphParams
): SubgraphResult {
  const maxNodes = params.maxNodes ?? DEFAULT_MAX_NODES;
  const maxEdges = params.maxEdges ?? DEFAULT_MAX_EDGES;

  let rels = caseFile.relationships.filter((r) => r.investigation_id === invId);
  if (params.evidenceBackedOnly) {
    rels = rels.filter((r) => isAssertionEvidenceBacked(r.evidence_ids, caseFile));
  }
  if (params.minConfidenceScore != null) {
    rels = rels.filter(
      (r) => (r.confidence?.score ?? 0) >= params.minConfidenceScore!
    );
  }
  if (params.relationshipTypes?.length) {
    const set = new Set(params.relationshipTypes);
    rels = rels.filter((r) => set.has(r.type));
  }

  const entityIds = new Set<string>();
  entityIds.add(params.seedEntityId);
  const relationshipIds = new Set<string>();

  const relsByFrom = new Map<string, typeof rels>();
  const relsByTo = new Map<string, typeof rels>();
  for (const r of rels) {
    if (!relsByFrom.has(r.from_entity_id)) relsByFrom.set(r.from_entity_id, []);
    relsByFrom.get(r.from_entity_id)!.push(r);
    if (!relsByTo.has(r.to_entity_id)) relsByTo.set(r.to_entity_id, []);
    relsByTo.get(r.to_entity_id)!.push(r);
  }

  const addNeighbors = (eid: string) => {
    for (const r of relsByFrom.get(eid) ?? []) {
      relationshipIds.add(r.id);
      entityIds.add(r.to_entity_id);
    }
    for (const r of relsByTo.get(eid) ?? []) {
      relationshipIds.add(r.id);
      entityIds.add(r.from_entity_id);
    }
  };

  addNeighbors(params.seedEntityId);
  if (params.hops === 2) {
    const hop1 = Array.from(entityIds);
    for (const eid of hop1) {
      addNeighbors(eid);
    }
  }

  const sortedEntityIds = Array.from(entityIds).sort();
  const sortedRelationshipIds = Array.from(relationshipIds).sort();
  const capped =
    sortedEntityIds.length > maxNodes || sortedRelationshipIds.length > maxEdges;
  const entityIdsCapped = sortedEntityIds.slice(0, maxNodes);
  const relationshipIdsCapped = sortedRelationshipIds.slice(0, maxEdges);

  return {
    entityIds: entityIdsCapped,
    relationshipIds: relationshipIdsCapped,
    capped,
  };
}

export interface CytoscapeNodeData {
  id: string;
  label: string;
  type: string;
  risk_tags?: string[];
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  source_kind: string;
  confidence_score: number;
  confidence_bucket: string;
  evidence_ids_count: number;
  evidence_backed: boolean;
}

export interface CytoscapeElementsResult {
  nodes: { data: CytoscapeNodeData }[];
  edges: { data: CytoscapeEdgeData }[];
}

/**
 * Convert subgraph to Cytoscape elements format.
 */
export function toCytoscapeElements(
  caseFile: CaseFile,
  invId: string,
  subgraph: { entityIds: string[]; relationshipIds: string[] }
): CytoscapeElementsResult {
  const entityMap = new Map(
    caseFile.entities
      .filter((e) => e.investigation_id === invId)
      .map((e) => [e.id, e])
  );
  const relMap = new Map(
    caseFile.relationships
      .filter((r) => r.investigation_id === invId)
      .map((r) => [r.id, r])
  );

  const nodes = subgraph.entityIds
    .map((id) => entityMap.get(id))
    .filter(Boolean)
    .map((entity) => ({
      data: {
        id: entity!.id,
        label: entity!.name,
        type: entity!.type,
        risk_tags: entity!.risk_tags,
      } as CytoscapeNodeData,
    }));

  const edges = subgraph.relationshipIds
    .map((id) => relMap.get(id))
    .filter(Boolean)
    .map((rel) => ({
      data: {
        id: rel!.id,
        source: rel!.from_entity_id,
        target: rel!.to_entity_id,
        type: rel!.type,
        label: displayLinkType(rel!.type),
        source_kind: rel!.source,
        confidence_score: rel!.confidence?.score ?? 0,
        confidence_bucket: rel!.confidence?.bucket ?? "LOW",
        evidence_ids_count: rel!.evidence_ids?.length ?? 0,
        evidence_backed: isAssertionEvidenceBacked(rel!.evidence_ids, caseFile),
      } as CytoscapeEdgeData,
    }));

  return { nodes, edges };
}
