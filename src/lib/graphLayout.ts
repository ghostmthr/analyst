/**
 * Cytoscape layout options shared by the Network view and report export.
 */

import type cytoscape from "cytoscape";

export const LAYOUT_PADDING = 50;
export const LAYOUT_SPACING_FACTOR = 1.6;
export const SPREAD_OUT_SPACING_MULTIPLIER = 2.25;
export const REPORT_NETWORK_LAYOUT = "cose";

export function getLayoutOptions(
  layoutName: string,
  animate: boolean,
  spacingMultiplier = 1
): cytoscape.LayoutOptions {
  const spacingFactor = LAYOUT_SPACING_FACTOR * spacingMultiplier;
  const base = {
    fit: true,
    padding: LAYOUT_PADDING,
    avoidOverlap: true,
    spacingFactor,
    animate,
  };
  if (layoutName === "breadthfirst") {
    return { ...base, name: "breadthfirst", directed: true, grid: true };
  }
  const minNodeSpacing = Math.round(36 * spacingMultiplier);
  if (layoutName === "pyramid") {
    return {
      ...base,
      name: "concentric",
      sort: (a: { degree: () => number }, b: { degree: () => number }) =>
        b.degree() - a.degree(),
      minNodeSpacing,
      equidistant: true,
    };
  }
  if (layoutName === "concentric") {
    return { ...base, name: "concentric", minNodeSpacing, equidistant: true };
  }
  if (layoutName === "cose") {
    return {
      ...base,
      name: "cose",
      idealEdgeLength: 100 * spacingMultiplier,
      nodeRepulsion: 8000 * spacingMultiplier,
      nodeOverlap: 20,
      componentSpacing: 60 * spacingMultiplier,
      numIter: 1000,
    };
  }
  if (layoutName === "grid") {
    return {
      ...base,
      name: "grid",
      condense: false,
      avoidOverlapPadding: Math.round(20 * spacingMultiplier),
    };
  }
  if (layoutName === "circle") {
    return { ...base, name: "circle" };
  }
  return { ...base, name: layoutName };
}
