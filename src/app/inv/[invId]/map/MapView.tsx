"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import { useEffect,useMemo, useState } from "react";

import EvidenceBackedBadge from "@/components/EvidenceBackedBadge";
import { useCase } from "@/contexts/CaseContext";
import { displayConfidence, displayEntityType, displayEventType, displayEvidenceSourceType, ENTITY_TYPE_OPTIONS } from "@/lib/labelRegistry";
import {
  buildEventPins,
  buildInvestigationPins,
  computeMapBounds,
  filterPins,
  type FilterPinsParams,
  type MapPin,
} from "@/lib/map";
import { getRiskFlagLabel } from "@/lib/riskFlagLookup";
import { RISK_FLAGS } from "@/lib/riskFlags";
import type { EntityType } from "@/types";

const LARGE_PIN_WARNING = 1000;

/** Fallback when a pin has no entity_type (e.g. legacy or event-derived pins). */
const DEFAULT_PIN_ENTITY_TYPE: EntityType = "PERSON";

export default function MapView({ invId }: { invId: string }) {
  const { caseFile } = useCase();

  const [search, setSearch] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | "">("");
  const [riskTagFilter, setRiskTagFilter] = useState("");
  const [evidenceBackedOnly, setEvidenceBackedOnly] = useState(false);
  const [minConfidencePct, setMinConfidencePct] = useState(0);
  const [showEntities, setShowEntities] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  const entityPins = useMemo(
    () => (caseFile ? buildInvestigationPins(caseFile, invId) : []),
    [caseFile, invId]
  );
  const eventPins = useMemo(
    () => (caseFile ? buildEventPins(caseFile, invId) : []),
    [caseFile, invId]
  );
  const pinsByLayer = useMemo(() => {
    const out: MapPin[] = [];
    if (showEntities) out.push(...entityPins);
    if (showEvents) out.push(...eventPins);
    return out;
  }, [entityPins, eventPins, showEntities, showEvents]);

  const filterParams: FilterPinsParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      entityTypes: entityTypeFilter ? [entityTypeFilter] : undefined,
      riskTags: riskTagFilter ? [riskTagFilter] : undefined,
      evidenceBackedOnly: evidenceBackedOnly || undefined,
      minConfidenceScore: minConfidencePct / 100,
    }),
    [search, entityTypeFilter, riskTagFilter, evidenceBackedOnly, minConfidencePct]
  );

  const filteredPins = useMemo(
    () => filterPins(pinsByLayer, filterParams),
    [pinsByLayer, filterParams]
  );

  const bounds = useMemo(() => computeMapBounds(filteredPins), [filteredPins]);
  const totalPins = entityPins.length + eventPins.length;
  const showLargeWarning = totalPins > LARGE_PIN_WARNING;
  const noLocations = totalPins === 0;
  const noMatches = pinsByLayer.length > 0 && filteredPins.length === 0;

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const selectedEvidence =
    selectedPin?.evidence_ids
      ?.map((id) => caseFile?.evidence.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => e != null) ?? [];

  return (
    <>
      <h1 className="analyst-h3Sub">Map</h1>
      {inv && (
        <p className="analyst-pageSubtitle analyst-gap16">{inv.title}</p>
      )}

      <div className="analyst-filterBar">
        <input
          type="text"
          className="analyst-filterControl"
          placeholder="SEARCH"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 160 }}
          aria-label="Search"
        />
        <select
          className="analyst-filterControl"
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter((e.target.value || "") as EntityType | "")}
          style={{ minWidth: 160 }}
          aria-label="Entity type"
        >
          <option value="">Entity type</option>
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="analyst-filterControl"
          value={riskTagFilter}
          onChange={(e) => setRiskTagFilter(e.target.value)}
          style={{ minWidth: 220 }}
          aria-label="Risk tag"
        >
          <option value="">Risk tags</option>
          {RISK_FLAGS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label} — {f.category}
            </option>
          ))}
        </select>
        <select
          className="analyst-filterControl"
          value={minConfidencePct}
          onChange={(e) => setMinConfidencePct(Number(e.target.value))}
          style={{ minWidth: 100 }}
          aria-label="Min confidence"
        >
          {[0, 25, 50, 75, 100].map((pct) => (
            <option key={pct} value={pct}>
              Min conf {pct}%
            </option>
          ))}
        </select>
        <label className="analyst-checkboxRow">
          <input
            type="checkbox"
            checked={evidenceBackedOnly}
            onChange={(e) => setEvidenceBackedOnly(e.target.checked)}
          />
          <span className="analyst-labelText">Evidence-backed only</span>
        </label>
        <label className="analyst-checkboxRow">
          <input type="checkbox" checked={showEntities} onChange={(e) => setShowEntities(e.target.checked)} />
          <span className="analyst-labelText">Entities</span>
        </label>
        <label className="analyst-checkboxRow">
          <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} />
          <span className="analyst-labelText">Events</span>
        </label>
      </div>

      {showLargeWarning && (
        <p className="analyst-textSecondary analyst-gap12">
          Large pin set ({totalPins}) — use filters to narrow.
        </p>
      )}

      <p className="analyst-textSecondary analyst-gap12">
        {filteredPins.length} location{filteredPins.length !== 1 ? "s" : ""}
      </p>

      {noLocations && (
        <p className="analyst-emptyState">
          No locations to display yet.
        </p>
      )}
      {noMatches && (
        <p className="analyst-textSecondary analyst-gap12">No locations match filters.</p>
      )}

      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 240px)" }}>
        <div style={{ flex: 1, minHeight: "calc(100vh - 240px)", position: "relative" }}>
          {!noLocations && (
            <LeafletMap
              pins={filteredPins}
              bounds={noMatches ? null : bounds}
              onSelectPin={setSelectedPin}
            />
          )}
        </div>
        <aside className="analyst-detailSidebar">
          {selectedPin ? (
            <PinDetailPanel
              pin={selectedPin}
              invId={invId}
              caseFile={caseFile}
              evidenceList={selectedEvidence}
            />
          ) : (
            <p className="analyst-textSecondary">
              Click a marker to see details.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

function PinDetailPanel({
  pin,
  invId,
  caseFile,
  evidenceList,
}: {
  pin: MapPin;
  invId: string;
  caseFile: import("@/types").CaseFile | null;
  evidenceList: import("@/types").Evidence[];
}) {
  const isEvent = pin.kind === "EVENT";
  const entity = !isEvent ? caseFile?.entities.find((e) => e.id === pin.entity_id) : null;

  return (
    <div>
      {isEvent ? (
        <>
          <h3 className="analyst-modalTitle analyst-detailLine">{pin.label}</h3>
          <p className="analyst-detailLineMuted">
            {displayEventType(pin.event_type ?? "")} · {pin.event_date}
          </p>
          {pin.event_text_preview && (
            <p className="analyst-detailLineSmall">{pin.event_text_preview}</p>
          )}
          {(pin.entity_count ?? 0) > 0 && (
            <p className="analyst-detailLineSmallMuted">
              Affected entities: {pin.entity_count}
            </p>
          )}
        </>
      ) : (
        <>
          <h3 className="analyst-modalTitle analyst-detailLine">{pin.entity_name ?? ""}</h3>
          <p className="analyst-detailLineMuted">{displayEntityType(pin.entity_type ?? DEFAULT_PIN_ENTITY_TYPE)}</p>
          {entity?.description && (
            <p className="analyst-detailLine">{entity.description}</p>
          )}
          {(pin.risk_tags?.length ?? 0) > 0 && (
            <p className="analyst-detailLineSmall">Risk tags: {pin.risk_tags!.map(getRiskFlagLabel).join(", ")}</p>
          )}
        </>
      )}
      <p className="analyst-detailLine">
        <strong>Location:</strong> {pin.label}
      </p>
      <p className="analyst-detailLineSmallMuted">
        {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
        {pin.accuracy_m != null && ` · ±${pin.accuracy_m}m`}
      </p>
      <EvidenceBackedBadge evidenceBacked={pin.evidence_backed} size={14} />
      <p className="analyst-detailLine analyst-mt12">
        Confidence: {displayConfidence(pin.confidence.bucket)} ({(pin.confidence.score * 100).toFixed(0)}%)
      </p>
      {pin.confidence.rationale && (
        <p className="analyst-monoSmall analyst-detailLineSmallMuted" style={{ margin: "4px 0 0" }}>{pin.confidence.rationale}</p>
      )}
      {evidenceList.length > 0 && (
        <div className="analyst-mt12">
          <p className="analyst-detailLine" style={{ fontWeight: 500 }}>Evidence</p>
          <ul className="analyst-listReset">
            {evidenceList.map((ev) => (
              <li key={ev.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <Link href={`/inv/${invId}/evidence/${ev.id}`} style={{ fontWeight: 500 }}>
                  {ev.title}
                </Link>
                <div className="analyst-monoSmall analyst-detailLineSmallMuted">
                  {displayEvidenceSourceType(ev.source.source_type)} · {ev.source.captured_at.slice(0, 10)}
                  {ev.file?.sha256 && ` · ${ev.file.sha256.slice(0, 16)}…`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="analyst-actionsRow analyst-mt12">
        {isEvent && pin.event_id && (
          <Link href={`/inv/${invId}/events/${pin.event_id}`} className="analyst-btnPrimary">
            Open Event
          </Link>
        )}
        {!isEvent && pin.entity_id && (
          <Link href={`/inv/${invId}/targets/${pin.entity_id}`} className="analyst-btnPrimary">
            Open Target
          </Link>
        )}
      </div>
    </div>
  );
}

type LeafletMapProps = {
  pins: MapPin[];
  bounds: [[number, number], [number, number]] | null;
  onSelectPin: (pin: MapPin) => void;
};

function LeafletMap({ pins, bounds, onSelectPin }: LeafletMapProps) {
  const [MapContent, setMapContent] = useState<React.ComponentType<LeafletMapProps> | null>(null);

  useEffect(() => {
    const L = require("leaflet");
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  useEffect(() => {
    import("react-leaflet").then((mod) => {
      const { useMap, MapContainer, TileLayer, Marker } = mod;

      function FitBoundsInner({ bounds: b }: { bounds: [[number, number], [number, number]] | null }) {
        const map = useMap();
        useEffect(() => {
          if (b) map.fitBounds(b);
        }, [b, map]);
        return null;
      }

      function ZoomControl() {
        const map = useMap();
        return (
          <div
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              zIndex: 1000,
            }}
          >
            <button
              type="button"
              className="analyst-filterControl"
              onClick={() => map.zoomIn()}
              style={{ minWidth: 36, padding: "0 8px", lineHeight: 1.2 }}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="analyst-filterControl"
              onClick={() => map.zoomOut()}
              style={{ minWidth: 36, padding: "0 8px", lineHeight: 1.2 }}
              aria-label="Zoom out"
            >
              −
            </button>
          </div>
        );
      }

      function LeafletMapContent({ pins: p, bounds: b, onSelectPin: onSelect }: LeafletMapProps) {
        const center: [number, number] = b
          ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]
          : [0, 0];
        const zoom = b ? 4 : 2;
        return (
          <MapContainer
            center={center}
            zoom={zoom}
            zoomControl={false}
            style={{ height: "100%", width: "100%", minHeight: 480, borderRadius: 4 }}
          >
            <FitBoundsInner bounds={b} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {p.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                eventHandlers={{ click: () => onSelect(pin) }}
              />
            ))}
            <ZoomControl />
          </MapContainer>
        );
      }

      setMapContent(() => LeafletMapContent);
    });
  }, []);

  if (!MapContent) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 240px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--panel)",
          borderRadius: 4,
        }}
      >
        Loading map…
      </div>
    );
  }

  return <MapContent pins={pins} bounds={bounds} onSelectPin={onSelectPin} />;
}
