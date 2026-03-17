/**
 * Map helpers — read-only, investigation-scoped.
 * Pins from entity.locations[] (Point). Confidence derived for location assertion only.
 */

import { bucketConfidence } from "@/lib/confidence";
import { isEvidenceBacked } from "@/lib/evidence";
import type {
  CaseFile,
  Confidence,
  EntityType,
  EventType,
} from "@/types";

export type MapPinKind = "ENTITY_LOCATION" | "EVENT";

export interface MapPin {
  id: string;
  invId: string;
  kind: MapPinKind;
  label: string;
  lat: number;
  lng: number;
  accuracy_m?: number | null;
  location_id: string;
  evidence_ids?: string[];
  evidence_backed: boolean;
  confidence: Confidence;
  // Entity pin fields
  entity_id?: string;
  entity_type?: EntityType;
  entity_name?: string;
  risk_tags?: string[];
  // Event pin fields
  event_id?: string;
  event_type?: EventType;
  event_date?: string;
  event_text_preview?: string;
  entity_count?: number;
}

/**
 * Derive location assertion confidence (not stored).
 * Evidence-backed: mean of evidence reliability; use (source_quality + credibility)/2 when both
 * exist, else the one that exists, else 0.60. Else: 0.40, LOW.
 */
export function deriveLocationConfidence(
  caseFile: CaseFile,
  evidenceIds?: string[]
): Confidence {
  if (evidenceIds?.length && isEvidenceBacked(evidenceIds, caseFile)) {
    const scores: number[] = [];
    for (const id of evidenceIds) {
      const ev = caseFile.evidence.find((e) => e.id === id);
      const rel = ev?.reliability;
      let s: number;
      if (rel?.source_quality != null && rel?.credibility != null) {
        s = (rel.source_quality + rel.credibility) / 2;
      } else if (rel?.source_quality != null) {
        s = rel.source_quality;
      } else if (rel?.credibility != null) {
        s = rel.credibility;
      } else {
        s = 0.6;
      }
      scores.push(s);
    }
    const mean =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0.6;
    const score = Math.max(0, Math.min(1, Number(mean.toFixed(4))));
    return {
      score,
      bucket: bucketConfidence(score),
      rationale: `Derived from mean evidence reliability across ${evidenceIds.length} linked evidence items.`,
    };
  }
  return {
    score: 0.4,
    bucket: "LOW",
    rationale:
      "No linked evidence; analyst-entered/unbacked location.",
  };
}

/**
 * Build pins from entity.locations[] (Point geometry only) for the investigation.
 */
export function buildInvestigationPins(
  caseFile: CaseFile,
  invId: string
): MapPin[] {
  const pins: MapPin[] = [];
  const entities = caseFile.entities.filter((e) => e.investigation_id === invId);
  for (const entity of entities) {
    const locations = entity.locations ?? [];
    for (const loc of locations) {
      if (loc.geometry.type !== "Point") continue;
      const [lng, lat] = loc.geometry.coordinates;
      const evidenceBacked = isEvidenceBacked(loc.evidence_ids, caseFile);
      const confidence = deriveLocationConfidence(caseFile, loc.evidence_ids);
      pins.push({
        id: `${entity.id}:${loc.id}`,
        invId,
        kind: "ENTITY_LOCATION",
        entity_id: entity.id,
        entity_type: entity.type,
        entity_name: entity.name,
        risk_tags: entity.risk_tags ?? [],
        location_id: loc.id,
        label: loc.label,
        lat,
        lng,
        accuracy_m: loc.accuracy_m ?? null,
        evidence_ids: loc.evidence_ids,
        evidence_backed: evidenceBacked,
        confidence,
      });
    }
  }
  return pins;
}

/**
 * Build pins from events with Point location for the investigation.
 * Location evidence-backed and confidence derived from event.location.evidence_ids.
 */
export function buildEventPins(
  caseFile: CaseFile,
  invId: string
): MapPin[] {
  const pins: MapPin[] = [];
  const events = (caseFile.events ?? []).filter((e) => e.investigation_id === invId);
  for (const ev of events) {
    const loc = ev.location;
    if (!loc || loc.geometry.type !== "Point") continue;
    const [lng, lat] = loc.geometry.coordinates;
    const evidenceBacked = isEvidenceBacked(loc.evidence_ids, caseFile);
    const confidence = deriveLocationConfidence(caseFile, loc.evidence_ids);
    pins.push({
      id: `evt:${ev.id}:${loc.id}`,
      invId,
      kind: "EVENT",
      location_id: loc.id,
      label: loc.label || `${ev.type} event`,
      lat,
      lng,
      accuracy_m: loc.accuracy_m ?? null,
      evidence_ids: loc.evidence_ids,
      evidence_backed: evidenceBacked,
      confidence,
      event_id: ev.id,
      event_type: ev.type,
      event_date: ev.date,
      event_text_preview: ev.text.slice(0, 80) + (ev.text.length > 80 ? "…" : ""),
      entity_count: ev.entity_ids?.length ?? 0,
    });
  }
  return pins;
}

export interface FilterPinsParams {
  entityTypes?: EntityType[];
  riskTags?: string[];
  evidenceBackedOnly?: boolean;
  minConfidenceScore?: number;
  search?: string;
}

export function filterPins(
  pins: MapPin[],
  params: FilterPinsParams
): MapPin[] {
  let result = pins;
  if (params.entityTypes?.length) {
    const set = new Set(params.entityTypes);
    result = result.filter((p) => p.kind !== "ENTITY_LOCATION" || (p.entity_type != null && set.has(p.entity_type)));
  }
  if (params.riskTags?.length) {
    result = result.filter(
      (p) =>
        p.kind !== "ENTITY_LOCATION" ||
        (p.risk_tags?.some((t) =>
          params.riskTags!.some((tag) => t.toLowerCase().includes(tag.toLowerCase()))
        ) ?? false)
    );
  }
  if (params.evidenceBackedOnly) {
    result = result.filter((p) => p.evidence_backed);
  }
  if (params.minConfidenceScore != null) {
    result = result.filter((p) => p.confidence.score >= params.minConfidenceScore!);
  }
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        (p.entity_name?.toLowerCase().includes(q) ?? false) ||
        p.label.toLowerCase().includes(q) ||
        (p.event_text_preview?.toLowerCase().includes(q) ?? false) ||
        (p.event_type?.toLowerCase().includes(q) ?? false)
    );
  }
  return result;
}

/**
 * Bounds as [[south, west], [north, east]] for Leaflet fitBounds.
 * Returns null if no pins.
 */
export function computeMapBounds(
  pins: MapPin[]
): [[number, number], [number, number]] | null {
  if (pins.length === 0) return null;
  let minLat = pins[0].lat;
  let maxLat = pins[0].lat;
  let minLng = pins[0].lng;
  let maxLng = pins[0].lng;
  for (const p of pins) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const pad = 0.01;
  return [
    [minLat - pad, minLng - pad],
    [maxLat + pad, maxLng + pad],
  ];
}
