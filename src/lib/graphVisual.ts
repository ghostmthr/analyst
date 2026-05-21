/**
 * Network graph colors and sizing — shared by Network view and report export.
 */

export const ENTITY_NODE_COLORS: Record<string, { base: string; dark: string }> = {
  PERSON: { base: "#29A9E0", dark: "#1a7a9e" },
  ORG: { base: "#03B791", dark: "#028a6b" },
  INFRA: { base: "#0d9488", dark: "#0f766e" },
  ASSET: { base: "#0891b2", dark: "#0e7490" },
  EVENT: { base: "#059669", dark: "#047857" },
  FIN_INSTRUMENT: { base: "#06b6d4", dark: "#0891b2" },
  GOV: { base: "#475569", dark: "#334155" },
};

export const DEFAULT_NODE_COLOR = "#29A9E0";
export const DEFAULT_NODE_DARK = "#1a7a9e";
export const NETWORK_GRAPH_BG = "#2D3741";
export const BASE_NODE_SIZE = 14;

export function nodeColor(type: string): string {
  return ENTITY_NODE_COLORS[type]?.base ?? DEFAULT_NODE_COLOR;
}
