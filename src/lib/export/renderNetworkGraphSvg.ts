/**
 * Investigation network graph as inline SVG for HTML/PDF reports.
 * Uses headless Cytoscape for layout; renders static SVG (no DOM/canvas).
 */

import cytoscape from "cytoscape";

import { getSubgraph, toCytoscapeElements } from "@/lib/graph";
import {
  getLayoutOptions,
  REPORT_NETWORK_LAYOUT,
  SPREAD_OUT_SPACING_MULTIPLIER,
} from "@/lib/graphLayout";
import { BASE_NODE_SIZE, NETWORK_GRAPH_BG, nodeColor } from "@/lib/graphVisual";
import type { CaseFile } from "@/types";

import type { ReportNetworkGraph } from "./reportModel";

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 420;
const VIEW_PADDING = 48;
const NODE_RADIUS = BASE_NODE_SIZE / 2;
const ORG_HALF = BASE_NODE_SIZE / 2;

function escSvg(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label;
  return `${label.slice(0, maxLen - 1)}…`;
}

/**
 * Build network graph SVG for the investigation report (2-hop subgraph from seed entity).
 */
export function buildReportNetworkGraph(
  caseFile: CaseFile,
  invId: string
): ReportNetworkGraph | undefined {
  const invEntities = caseFile.entities
    .filter((e) => e.investigation_id === invId)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (invEntities.length === 0) return undefined;

  const seedEntity = invEntities[0];
  const subgraph = getSubgraph(caseFile, invId, {
    seedEntityId: seedEntity.id,
    hops: 2,
    maxNodes: 200,
    maxEdges: 400,
  });
  if (subgraph.entityIds.length === 0) return undefined;

  const elements = toCytoscapeElements(caseFile, invId, subgraph);
  if (elements.nodes.length === 0) return undefined;

  const cy = cytoscape({
    headless: true,
    elements: [
      ...elements.nodes.map((n) => ({ group: "nodes" as const, data: n.data })),
      ...elements.edges.map((e) => ({ group: "edges" as const, data: e.data })),
    ],
  });

  const layoutOpts = getLayoutOptions(
    REPORT_NETWORK_LAYOUT,
    false,
    SPREAD_OUT_SPACING_MULTIPLIER
  );
  cy.layout(layoutOpts).run();

  const nodePositions = new Map<string, { x: number; y: number }>();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of cy.nodes()) {
    const pos = node.position();
    nodePositions.set(node.id(), pos);
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const innerW = VIEW_WIDTH - VIEW_PADDING * 2;
  const innerH = VIEW_HEIGHT - VIEW_PADDING * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);

  const mapX = (x: number) => VIEW_PADDING + (x - minX) * scale;
  const mapY = (y: number) => VIEW_PADDING + (y - minY) * scale;

  const nodeById = new Map(elements.nodes.map((n) => [n.data.id, n.data]));
  const edgeData = elements.edges.map((e) => e.data);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" width="100%" role="img" aria-label="Investigation network map">`
  );
  parts.push(`<rect width="100%" height="100%" fill="${NETWORK_GRAPH_BG}"/>`);
  parts.push(
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af"/></marker></defs>`
  );

  for (const edge of edgeData) {
    const src = nodePositions.get(edge.source);
    const tgt = nodePositions.get(edge.target);
    if (!src || !tgt) continue;
    const x1 = mapX(src.x);
    const y1 = mapY(src.y);
    const x2 = mapX(tgt.x);
    const y2 = mapY(tgt.y);
    const opacity = 0.35 + 0.55 * (edge.confidence_score ?? 0);
    const strokeWidth =
      edge.evidence_backed && edge.source_kind === "EVIDENCE" ? 1.25 : 0.75;
    const dash =
      edge.evidence_backed && edge.source_kind === "EVIDENCE" ? "" : ' stroke-dasharray="4 3"';
    parts.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9ca3af" stroke-width="${strokeWidth}" opacity="${opacity.toFixed(2)}" marker-end="url(#arrow)"${dash}/>`
    );
  }

  for (const [id, pos] of nodePositions) {
    const data = nodeById.get(id);
    if (!data) continue;
    const cx = mapX(pos.x);
    const cy = mapY(pos.y);
    const fill = nodeColor(data.type);
    if (data.type === "ORG") {
      parts.push(
        `<rect x="${cx - ORG_HALF}" y="${cy - ORG_HALF}" width="${BASE_NODE_SIZE}" height="${BASE_NODE_SIZE}" fill="${fill}" rx="1"/>`
      );
    } else {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${NODE_RADIUS}" fill="${fill}"/>`);
    }
    const label = truncateLabel(data.label, 28);
    parts.push(
      `<text x="${cx}" y="${cy + NODE_RADIUS + 10}" text-anchor="middle" fill="#E8EDF5" font-size="7" font-weight="700" font-family="system-ui,sans-serif">${escSvg(label)}</text>`
    );
  }

  parts.push(`</svg>`);

  const caption = `Seed: ${seedEntity.name} · 2 hops · ${elements.nodes.length} entities · ${elements.edges.length} relationships`;
  return {
    svg: parts.join(""),
    caption,
    seed_entity_name: seedEntity.name,
    hops: 2,
    node_count: elements.nodes.length,
    edge_count: elements.edges.length,
    capped: subgraph.capped || undefined,
  };
}
