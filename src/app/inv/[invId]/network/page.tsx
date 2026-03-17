"use client";

import type cytoscape from "cytoscape";
import { useParams } from "next/navigation";
import { useCallback, useEffect,useMemo, useRef, useState } from "react";

import { useCase } from "@/contexts/CaseContext";
import { getEntityAssertionSummary } from "@/lib/derived";
import { getSubgraph, toCytoscapeElements } from "@/lib/graph";
import { LINK_TYPE_OPTIONS } from "@/lib/labelRegistry";
import type { RelationshipType } from "@/types";

import NetworkEdgePanel from "./NetworkEdgePanel";
import NetworkNodePanel from "./NetworkNodePanel";

// Entity-type node colors: base and darker (for selected/hover). Palette tuned to site greens/blues.
const ENTITY_NODE_COLORS: Record<string, { base: string; dark: string }> = {
  PERSON: { base: "#29A9E0", dark: "#1a7a9e" },
  ORG: { base: "#03B791", dark: "#028a6b" },
  INFRA: { base: "#0d9488", dark: "#0f766e" },
  ASSET: { base: "#0891b2", dark: "#0e7490" },
  EVENT: { base: "#059669", dark: "#047857" },
  FIN_INSTRUMENT: { base: "#06b6d4", dark: "#0891b2" },
  GOV: { base: "#475569", dark: "#334155" },
};

const DEFAULT_NODE_COLOR = "#29A9E0";
const DEFAULT_NODE_DARK = "#1a7a9e";

const BASE_NODE_SIZE = 24;

const LAYOUT_OPTIONS: { value: string; label: string }[] = [
  { value: "breadthfirst", label: "Hierarchy" },
  { value: "concentric", label: "Clusters" },
  { value: "grid", label: "Grid" },
  { value: "circle", label: "Circle" },
  { value: "pyramid", label: "Pyramid" },
  { value: "cose", label: "Organic" },
];

const LAYOUT_PADDING = 50;
const LAYOUT_SPACING_FACTOR = 1.4;

function getLayoutOptions(layoutName: string, animate: boolean) {
  const base = { fit: true, padding: LAYOUT_PADDING, avoidOverlap: true, spacingFactor: LAYOUT_SPACING_FACTOR, animate };
  if (layoutName === "breadthfirst") {
    return { ...base, name: "breadthfirst", directed: true, grid: true };
  }
  if (layoutName === "pyramid") {
    return {
      ...base,
      name: "concentric",
      sort: (a: { degree: () => number }, b: { degree: () => number }) => b.degree() - a.degree(),
      minNodeSpacing: 60,
      equidistant: true,
    };
  }
  if (layoutName === "concentric") {
    return { ...base, name: "concentric", minNodeSpacing: 60, equidistant: true };
  }
  if (layoutName === "cose") {
    return {
      ...base,
      name: "cose",
      idealEdgeLength: 150,
      nodeRepulsion: 12000,
      nodeOverlap: 30,
      componentSpacing: 80,
      numIter: 1000,
    };
  }
  if (layoutName === "grid") {
    return { ...base, name: "grid", condense: false, avoidOverlapPadding: 20 };
  }
  if (layoutName === "circle") {
    return { ...base, name: "circle" };
  }
  return { ...base, name: layoutName };
}

export default function NetworkPage() {
  const params = useParams();
  const invId = params.invId as string;
  const { caseFile } = useCase();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutRef = useRef<string>("cose");

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const invEntities = useMemo(
    () => caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.entities, invId]
  );

  const [seedEntityId, setSeedEntityId] = useState<string>("");
  const [hops, setHops] = useState<1 | 2>(1);
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState<string>("");
  const [minConfidencePct, setMinConfidencePct] = useState(0);
  const [evidenceBackedOnly, setEvidenceBackedOnly] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [layout, setLayout] = useState<string>("cose");
  layoutRef.current = layout;
  const [nodeSize, setNodeSize] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);

  const effectiveSeed =
    seedEntityId && invEntities.some((e) => e.id === seedEntityId)
      ? seedEntityId
      : invEntities[0]?.id ?? "";

  const subgraph = useMemo(() => {
    if (!caseFile || !effectiveSeed) return null;
    return getSubgraph(caseFile, invId, {
      seedEntityId: effectiveSeed,
      hops,
      relationshipTypes: relationshipTypeFilter
        ? ([relationshipTypeFilter] as RelationshipType[])
        : undefined,
      minConfidenceScore: minConfidencePct / 100,
      evidenceBackedOnly,
      maxNodes: 200,
      maxEdges: 400,
    });
  }, [caseFile, invId, effectiveSeed, hops, relationshipTypeFilter, minConfidencePct, evidenceBackedOnly]);

  const elementsResult = useMemo(() => {
    if (!caseFile || !subgraph) return null;
    return toCytoscapeElements(caseFile, invId, subgraph);
  }, [caseFile, invId, subgraph]);

  const resetFilters = useCallback(() => {
    setHops(1);
    setRelationshipTypeFilter("");
    setMinConfidencePct(0);
    setEvidenceBackedOnly(false);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  useEffect(() => {
    if (!invEntities.length || seedEntityId) return;
    setSeedEntityId(invEntities[0]?.id ?? "");
  }, [invEntities, seedEntityId]);

  useEffect(() => {
    if (!containerRef.current || !elementsResult || !subgraph) return;
    const initCy = async () => {
      const createCy = (await import("cytoscape")).default as (
        opts?: cytoscape.CytoscapeOptions
      ) => cytoscape.Core;
      const container = containerRef.current;
      if (!container) return;
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      const cy: cytoscape.Core = createCy({
        container,
        elements: [
          ...elementsResult.nodes.map((n) => ({ group: "nodes" as const, data: n.data })),
          ...elementsResult.edges.map((e) => ({ group: "edges" as const, data: e.data })),
        ],
        style: [
          {
            selector: "core",
            style: { "background-color": "#2D3741" },
          },
          {
            selector: "node",
            style: {
              label: "data(label)",
              "text-valign": "bottom",
              "text-halign": "center",
              "text-margin-y": 4,
              "font-size": "5px",
              color: "#E8EDF5",
              "overlay-opacity": 0,
              "overlay-color": "transparent",
              "border-width": 0,
              width: BASE_NODE_SIZE,
              height: BASE_NODE_SIZE,
              "background-color": (ele: { data: (k: string) => string }) =>
                ENTITY_NODE_COLORS[ele.data("type")]?.base ?? DEFAULT_NODE_COLOR,
              shape: (ele: { data: (k: string) => string }) =>
                ele.data("type") === "ORG" ? "rectangle" : "ellipse",
              "text-max-width": "80px",
              "text-wrap": "wrap",
            },
          },
          {
            selector: "node:selected",
            style: {
              "background-color": (ele: { data: (k: string) => string }) =>
                ENTITY_NODE_COLORS[ele.data("type")]?.dark ?? DEFAULT_NODE_DARK,
              "overlay-opacity": 0,
              "border-width": 0,
            },
          },
          {
            selector: "node:hover",
            style: {
              "background-color": (ele: { data: (k: string) => string }) =>
                ENTITY_NODE_COLORS[ele.data("type")]?.dark ?? DEFAULT_NODE_DARK,
              "overlay-opacity": 0,
              "border-width": 0,
            },
          },
          {
            selector: "edge",
            style: {
              width: (ele: { data: () => { evidence_backed?: boolean; source_kind?: string; confidence_score?: number } }) => {
                const d = ele.data();
                const base = d.evidence_backed && d.source_kind === "EVIDENCE" ? 2 : 1;
                return base * (0.5 + (d.confidence_score ?? 0));
              },
              "line-style": (ele: { data: () => { evidence_backed?: boolean; source_kind?: string } }) => {
                const d = ele.data();
                return d.evidence_backed && d.source_kind === "EVIDENCE" ? "solid" : "dashed";
              },
              opacity: (ele: { data: () => { confidence_score?: number } }) =>
                0.4 + 0.6 * (ele.data().confidence_score ?? 0),
              "target-arrow-shape": "triangle",
              "arrow-scale": 2.5,
              "curve-style": "bezier",
              label: "data(label)",
              "font-size": "6px",
              color: "#E8EDF5",
              "text-rotation": "autorotate",
              "text-valign": "bottom",
              "text-max-width": "90px",
              "text-wrap": "wrap",
              "text-background-color": "#2d3741",
              "text-background-opacity": 1,
              "text-background-padding": "4px",
              "text-background-shape": "roundrectangle",
            },
          },
          {
            selector: "edge:selected",
            style: { "line-color": "#5A7291", "target-arrow-color": "#5A7291" },
          },
        ],
        layout: { name: "cose", animate: false },
      });
      cy.on("zoom", () => setZoomLevel(Math.round(cy.zoom() * 100)));
      setZoomLevel(Math.round(cy.zoom() * 100));
      cy.on("tap", "node", (ev) => {
        setSelectedNodeId(ev.target.id());
        setSelectedEdgeId(null);
      });
      cy.on("tap", "edge", (ev) => {
        setSelectedEdgeId(ev.target.id());
        setSelectedNodeId(null);
      });
      cy.on("tap", (ev) => {
        if (ev.target === cy) {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }
      });
      cyRef.current = cy;
      const currentLayout = layoutRef.current;
      const layoutOpts = getLayoutOptions(currentLayout, false);
      const layoutInstance = cy.layout(layoutOpts);
      layoutInstance.on("layoutstop", () => {
        cy.fit(undefined, 50);
      });
      layoutInstance.run();
    };
    initCy();
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elementsResult, subgraph]);

  useEffect(() => {
    if (!cyRef.current) return;
    const opts = getLayoutOptions(layout, true);
    const layoutInstance = cyRef.current.layout(opts);
    layoutInstance.on("layoutstop", () => {
      cyRef.current?.fit(undefined, 50);
    });
    layoutInstance.run();
  }, [layout]);

  useEffect(() => {
    if (!cyRef.current) return;
    const size = BASE_NODE_SIZE * nodeSize;
    cyRef.current.nodes().style({ width: size, height: size });
  }, [nodeSize]);

  const handleZoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const z = cy.zoom();
    cy.zoom(z * 1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const z = cy.zoom();
    cy.zoom(z / 1.2);
  }, []);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 40);
  }, []);

  const selectedEntity = useMemo(() => {
    if (!selectedNodeId || !caseFile) return null;
    return caseFile.entities.find((e) => e.id === selectedNodeId);
  }, [selectedNodeId, caseFile]);

  const selectedRelationship = useMemo(() => {
    if (!selectedEdgeId || !caseFile) return null;
    return caseFile.relationships.find((r) => r.id === selectedEdgeId);
  }, [selectedEdgeId, caseFile]);

  const assertionSummary =
    selectedNodeId && caseFile
      ? getEntityAssertionSummary(caseFile, invId, selectedNodeId)
      : null;

  const selectedRelEvidence: import("@/types").Evidence[] =
    selectedRelationship?.evidence_ids
      ?.map((id) => caseFile?.evidence.find((e) => e.id === id))
      .filter((e): e is import("@/types").Evidence => e != null) ?? [];

  return (
    <>
      <h1 className="analyst-h3Sub">Network</h1>
      {inv && (
        <p className="analyst-pageSubtitle analyst-gap16">{inv.title}</p>
      )}

      <div className="analyst-filterBar">
        <select
          className="analyst-filterControl"
          value={effectiveSeed}
          onChange={(e) => setSeedEntityId(e.target.value)}
          style={{ minWidth: 160 }}
          aria-label="Seed entity"
        >
          {invEntities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          className="analyst-filterControl"
          value={hops}
          onChange={(e) => setHops(Number(e.target.value) as 1 | 2)}
          style={{ minWidth: 72 }}
          aria-label="Hops"
        >
          <option value={1}>1 HOP</option>
          <option value={2}>2 HOPS</option>
        </select>
        <select
          className="analyst-filterControl"
          value={relationshipTypeFilter}
          onChange={(e) => setRelationshipTypeFilter(e.target.value)}
          style={{ minWidth: 160 }}
          aria-label="Relationship type"
        >
          <option value="">Relationship type</option>
          {LINK_TYPE_OPTIONS.filter((o) => o.key !== "CUSTOM").map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
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
        <select
          className="analyst-filterControl"
          value={layout}
          onChange={(e) => setLayout(e.target.value)}
          style={{ minWidth: 120 }}
          aria-label="Layout"
        >
          {LAYOUT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="analyst-actionsRowTight">
          <button type="button" onClick={handleZoomOut} className="analyst-filterControl" style={{ minWidth: 36, padding: "0 8px" }} aria-label="Zoom out">
            −
          </button>
          <span className="analyst-labelText" style={{ minWidth: 40, textAlign: "center" }}>{zoomLevel}%</span>
          <button type="button" onClick={handleZoomIn} className="analyst-filterControl" style={{ minWidth: 36, padding: "0 8px" }} aria-label="Zoom in">
            +
          </button>
        </div>
        <button type="button" onClick={handleFit} className="analyst-filterControl">
          FIT TO SCREEN
        </button>
        <label className="analyst-checkboxRow analyst-checkboxRowGap8">
          <span className="analyst-labelText">Node size</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.25}
            value={nodeSize}
            onChange={(e) => setNodeSize(Number(e.target.value))}
            style={{ width: 72 }}
          />
          <span style={{ minWidth: 28 }}>{Math.round(nodeSize * 100)}%</span>
        </label>
        <button type="button" onClick={resetFilters} className="analyst-btnSecondary">
          RESET
        </button>
      </div>

      {subgraph?.capped && (
        <p className="analyst-textSecondary analyst-gap12">
          Graph too large — narrow filters or reduce hops.
        </p>
      )}

      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 240px)" }}>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            minHeight: "calc(100vh - 240px)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "#2D3741",
          }}
        />
        <aside className="analyst-detailSidebar">
          {selectedNodeId && selectedEntity && (
            <NetworkNodePanel
              entity={selectedEntity}
              invId={invId}
              assertionSummary={assertionSummary}
            />
          )}
          {selectedEdgeId && selectedRelationship && caseFile && (
            <NetworkEdgePanel
              relationship={selectedRelationship}
              caseFile={caseFile}
              invId={invId}
              evidenceList={selectedRelEvidence}
            />
          )}
          {!selectedNodeId && !selectedEdgeId && (
            <p className="analyst-textSecondary">Click a node or edge for details.</p>
          )}
        </aside>
      </div>
    </>
  );
}

