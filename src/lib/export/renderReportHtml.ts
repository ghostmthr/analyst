/**
 * HTML report renderer — self-contained, printable.
 */

import { getRiskFlagLabel } from "@/lib/riskFlagLookup";

import type { ReportModel } from "./reportModel";

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.5; }
  h1 { font-size: 1.5rem; margin: 0 0 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  h2 { font-size: 1.2rem; margin: 24px 0 12px; color: #374151; }
  h3 { font-size: 1rem; margin: 16px 0 8px; color: #4b5563; }
  .meta { font-size: 0.875rem; color: #6b7280; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.9rem; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; }
  .profile { margin: 16px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fafafa; }
  .profile h3 { margin-top: 0; }
  .stats { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.875rem; color: #6b7280; margin: 8px 0; }
  .judgment { margin: 12px 0; padding: 12px; border-left: 3px solid #3b82f6; background: #f8fafc; }
  .evidence-row { font-family: monospace; font-size: 0.8rem; }
  .sha256 { color: #059669; word-break: break-all; }
  .network-graph { margin: 16px 0; max-width: 100%; overflow: hidden; border-radius: 4px; border: 1px solid #e5e7eb; page-break-inside: avoid; }
  @media print { body { padding: 16px; } .no-print { display: none; } }
`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderReportHtml(model: ReportModel): string {
  const parts: string[] = [];

  parts.push(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Analyst Brief — ${esc(model.investigation.title)}</title><style>${CSS}</style></head><body>`);

  parts.push(`<h1>${esc(model.investigation.title)}</h1>`);
  parts.push(`<div class="meta">Generated ${esc(model.generated_at)} · Status: ${esc(model.investigation.status)}${model.investigation.lead ? ` · Lead: ${esc(model.investigation.lead)}` : ""}</div>`);
  if (model.metadata) {
    parts.push(`<div class="meta report-metadata" style="margin-bottom:16px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;font-size:0.8rem;">`);
    parts.push(`<strong>Report metadata</strong>: schema ${esc(model.metadata.schema_version)} · system ${esc(model.metadata.system_version)} · case ${esc(model.metadata.case_id)} · inv ${esc(model.metadata.investigation_id)} · generated ${esc(model.metadata.generated_at)} · state_id <code class="sha256">${esc(model.metadata.state_id)}</code>`);
    parts.push(`</div>`);
  }

  parts.push(`<h2>Targets summary</h2>`);
  parts.push(`<p>${model.targets_summary.count} entit${model.targets_summary.count === 1 ? "y" : "ies"}`);
  const typeEntries = Object.entries(model.targets_summary.by_type).sort((a, b) => b[1] - a[1]);
  if (typeEntries.length > 0) {
    parts.push(` (${typeEntries.map(([t, n]) => `${t}: ${n}`).join(", ")})`);
  }
  parts.push(`</p>`);

  if (model.entity_profiles.length > 0) {
    parts.push(`<h2>Entity profiles</h2>`);
    for (const ep of model.entity_profiles) {
      parts.push(`<div class="profile">`);
      parts.push(`<h3>${esc(ep.name)}</h3>`);
      parts.push(`<p><strong>${esc(ep.type)}</strong>${ep.risk_tags?.length ? ` · ${ep.risk_tags.map((k) => esc(getRiskFlagLabel(k))).join(", ")}` : ""}</p>`);
      if (ep.description) parts.push(`<p>${esc(ep.description)}</p>`);
      if (ep.summary) parts.push(`<p>${esc(ep.summary)}</p>`);
      parts.push(`<div class="stats">`);
      parts.push(`Locations: ${ep.locations_count} · `);
      parts.push(`Claims: ${ep.claims_evidence_backed}/${ep.claims_total} evidence-backed · `);
      parts.push(`Relationships: ${ep.relationships_evidence_backed}/${ep.relationships_total} evidence-backed · `);
      parts.push(`High confidence: ${ep.high_confidence_total}`);
      parts.push(`</div></div>`);
    }
  }

  if (model.timeline_highlights.length > 0) {
    parts.push(`<h2>Timeline highlights</h2>`);
    parts.push(`<table><thead><tr><th>Date</th><th>Type</th><th>Event</th></tr></thead><tbody>`);
    for (const th of model.timeline_highlights) {
      parts.push(`<tr><td>${esc(th.date)}</td><td>${esc(th.type)}</td><td>${esc(th.text)}</td></tr>`);
    }
    parts.push(`</tbody></table>`);
  }

  if (model.assessment_summary) {
    parts.push(`<h2>Assessment summary</h2>`);
    parts.push(`<p><strong>Question:</strong> ${esc(model.assessment_summary.question)}</p>`);
    if (model.assessment_summary.top_hypothesis_label) {
      parts.push(`<p><strong>Top hypothesis:</strong> ${esc(model.assessment_summary.top_hypothesis_label)}</p>`);
    }
    for (const kj of model.assessment_summary.key_judgments) {
      parts.push(`<div class="judgment">`);
      parts.push(`<p>${esc(kj.text)}</p>`);
      parts.push(`<p class="meta">Confidence: ${esc(kj.confidence)} (${(kj.confidence_score * 100).toFixed(0)}%)</p>`);
      parts.push(`</div>`);
    }
    if (model.assessment_summary.alternative_explanations?.length) {
      parts.push(`<h3>Alternative explanations</h3><ul>`);
      for (const a of model.assessment_summary.alternative_explanations!) {
        parts.push(`<li>${esc(a)}</li>`);
      }
      parts.push(`</ul>`);
    }
    if (model.assessment_summary.intelligence_gaps?.length) {
      parts.push(`<h3>Intelligence gaps</h3><ul>`);
      for (const g of model.assessment_summary.intelligence_gaps!) {
        parts.push(`<li>${esc(g)}</li>`);
      }
      parts.push(`</ul>`);
    }
  }

  if (model.ach_appendix) {
    const ach = model.ach_appendix;
    parts.push(`<h2>ACH Appendix</h2>`);
    parts.push(`<p><strong>Question:</strong> ${esc(ach.question)}</p>`);
    parts.push(`<h3>Hypotheses</h3><ul>`);
    for (const h of ach.hypotheses) {
      parts.push(`<li><strong>${esc(h.label)}</strong>: ${esc(h.statement)}</li>`);
    }
    parts.push(`</ul>`);
    parts.push(`<h3>Diagnostic claims</h3><table><thead><tr><th>ID</th><th>Text</th><th>Diag</th><th>Rel</th><th>Cred</th><th>Conf</th></tr></thead><tbody>`);
    for (const d of ach.diagnostic_claims) {
      parts.push(`<tr><td>${esc(d.id)}</td><td>${esc(d.text.slice(0, 60))}${d.text.length > 60 ? "…" : ""}</td><td>${d.diagnosticity}</td><td>${d.reliability.toFixed(2)}</td><td>${d.credibility.toFixed(2)}</td><td>${d.confidence != null ? (d.confidence * 100).toFixed(0) + "%" : "—"}</td></tr>`);
    }
    parts.push(`</tbody></table>`);
    parts.push(`<h3>ACH grid</h3><table><thead><tr><th>Claim</th>`);
    for (const h of ach.hypotheses) {
      parts.push(`<th>${esc(h.label)}</th>`);
    }
    parts.push(`</tr></thead><tbody>`);
    const dclmIds = [...new Set(ach.cells.map((c) => c.diagnostic_claim_id))].sort((a, b) => a.localeCompare(b));
    const hypIds = [...new Set(ach.cells.map((c) => c.hypothesis_id))].sort((a, b) => a.localeCompare(b));
    const cellLookup = new Map(ach.cells.map((c) => [`${c.diagnostic_claim_id}:${c.hypothesis_id}`, c.relation]));
    const dclmById = new Map(ach.diagnostic_claims.map((d) => [d.id, d]));
    for (const dclmId of dclmIds) {
      const dclm = dclmById.get(dclmId);
      parts.push(`<tr><td>${dclm ? esc(dclm.text.slice(0, 30)) + (dclm.text.length > 30 ? "…" : "") : esc(dclmId)}</td>`);
      for (const hypId of hypIds) {
        const rel = cellLookup.get(`${dclmId}:${hypId}`) ?? "NA";
        parts.push(`<td>${esc(rel)}</td>`);
      }
      parts.push(`</tr>`);
    }
    parts.push(`</tbody></table>`);
    if (ach.results?.length) {
      parts.push(`<h3>Computed results</h3><table><thead><tr><th>Rank</th><th>Hypothesis</th><th>Penalty</th></tr></thead><tbody>`);
      for (const r of ach.results) {
        parts.push(`<tr><td>${r.rank}</td><td>${esc(r.label)}</td><td>${r.penalty.toFixed(4)}</td></tr>`);
      }
      parts.push(`</tbody></table>`);
      if (ach.separation != null && ach.evidence_coverage != null && ach.arc != null) {
        parts.push(`<p>Separation: ${(ach.separation * 100).toFixed(1)}% · Evidence coverage: ${(ach.evidence_coverage * 100).toFixed(1)}% · ARC: ${(ach.arc * 100).toFixed(1)}%</p>`);
      }
    }
    if (ach.sensitivity) {
      parts.push(`<h3>Sensitivity summary</h3><p>Last run: ${esc(ach.sensitivity.last_run_at ?? "")} · Evidence: ${esc(ach.sensitivity.evidence_id ?? "")} · Rank flipped: ${ach.sensitivity.rank_flipped ? "Yes" : "No"} · Separation drop: ${ach.sensitivity.separation_drop?.toFixed(4) ?? "—"}</p>`);
    }
  }

  parts.push(`<h2>Confidence explanation appendix</h2>`);
  parts.push(`<p>Analyst uses a 4-factor confidence model:</p><ul>`);
  parts.push(`<li><strong>ES (Evidence Strength)</strong> — 35%: quality and completeness of supporting evidence</li>`);
  parts.push(`<li><strong>SQ (Source Quality)</strong> — 25%: reliability of the source</li>`);
  parts.push(`<li><strong>COR (Corroboration)</strong> — 20%: extent of independent confirmation</li>`);
  parts.push(`<li><strong>AC (Analyst Confidence)</strong> — 20%: analyst judgment</li>`);
  parts.push(`</ul><p>Formula: score = 0.35×ES + 0.25×SQ + 0.20×COR + 0.20×AC</p>`);
  parts.push(`<p>Buckets: <strong>HIGH</strong> ≥75%, <strong>MODERATE</strong> 50–74%, <strong>LOW</strong> &lt;50%</p>`);
  parts.push(`<p><em>Confidence reflects analytic judgment based on available information. It is not legal proof and does not establish facts.</em></p>`);

  parts.push(`<h2>Evidence references appendix</h2>`);
  parts.push(`<table><thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Source</th><th>Captured</th><th>SHA-256</th><th>Status</th></tr></thead><tbody>`);
  for (const ev of model.evidence_appendix) {
    parts.push(`<tr class="evidence-row">`);
    parts.push(`<td>${esc(ev.id)}</td>`);
    parts.push(`<td>${esc(ev.title)}</td>`);
    parts.push(`<td>${esc(ev.type)}</td>`);
    parts.push(`<td>${esc(ev.source_type)}</td>`);
    parts.push(`<td>${esc(ev.captured_at)}</td>`);
    parts.push(`<td class="sha256">${ev.file_sha256 ? esc(ev.file_sha256) : "—"}</td>`);
    parts.push(`<td>${ev.missing_attachment ? "Missing attachment" : ev.has_file ? "File" : "—"}</td>`);
    parts.push(`</tr>`);
  }
  parts.push(`</tbody></table>`);

  if (model.network_analysis?.paragraphs.length) {
    parts.push(`<h2>Network analysis</h2>`);
    for (const paragraph of model.network_analysis.paragraphs) {
      parts.push(`<p>${esc(paragraph)}</p>`);
    }
  }

  if (model.network_graph) {
    const g = model.network_graph;
    parts.push(`<h2>Network map</h2>`);
    if (g.capped) {
      parts.push(
        `<p class="meta">Graph capped for report size — use the Network view for the full graph.</p>`
      );
    }
    parts.push(`<p class="meta">${esc(g.caption)}</p>`);
    parts.push(`<div class="network-graph">${g.svg}</div>`);
  }

  parts.push(`</body></html>`);
  return parts.join("");
}
