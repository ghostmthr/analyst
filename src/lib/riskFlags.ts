/**
 * Canonical risk flags for typeahead and display.
 * Store tag_key; display label. Custom tags use custom:<kebab-case>.
 */

export const RISK_FLAGS = [
  { key: "ai-relevant", label: "AI Relevant", category: "Cyber / Technology" },
  { key: "advanced-manufacturing", label: "Advanced Manufacturing", category: "Proliferation / Export Control" },
  { key: "beneficial-ownership-unknown", label: "Beneficial Ownership Unknown", category: "Financial / Illicit" },
  { key: "chemical-biological-risk", label: "Chemical / Biological Risk", category: "Proliferation" },
  { key: "compliance-risk", label: "Compliance Risk", category: "Legal / Regulatory" },
  { key: "compute-infrastructure", label: "Compute Infrastructure", category: "Cyber / Technology" },
  { key: "critical-infrastructure", label: "Critical Infrastructure", category: "National Security" },
  { key: "ccp-linked", label: "State-Linked (PRC)", category: "National Security" },
  { key: "cyber-enabled-activity", label: "Cyber-Enabled Activity", category: "Cyber / Technology" },
  { key: "cyber-operations", label: "Cyber Operations", category: "Cyber / Technology" },

  { key: "data-access-risk", label: "Data Access Risk", category: "Cyber / Technology" },
  { key: "designation-pending", label: "Designation Pending", category: "Legal / Regulatory" },
  { key: "dual-use-technology", label: "Dual-Use Technology", category: "National Security" },
  { key: "encryption-relevant", label: "Encryption Relevant", category: "Cyber / Technology" },
  { key: "enforcement-interest", label: "Enforcement Interest", category: "Legal / Regulatory" },
  { key: "export-control-sensitive", label: "Export Control Sensitive", category: "Legal / Regulatory" },
  { key: "export-controlled-entity", label: "Export Controlled Entity", category: "Legal / Regulatory" },
  { key: "financial-facilitator", label: "Financial Facilitator", category: "Financial / Illicit" },
  { key: "foreign-adversary-linked", label: "Foreign Adversary Linked", category: "National Security" },

  { key: "government-access", label: "Government Access", category: "Governance / Influence" },
  { key: "high-priority", label: "High Priority", category: "Operational / Analytic" },
  { key: "high-risk-jurisdiction", label: "High-Risk Jurisdiction", category: "Financial / Illicit" },
  { key: "influence-operations", label: "Influence Operations", category: "Governance / Influence" },
  { key: "intelligence-linked", label: "Intelligence Service Linked", category: "National Security" },
  { key: "law-enforcement-interest", label: "Law Enforcement Interest", category: "Investigation / Case" },
  { key: "licensing-required", label: "Licensing Required", category: "Legal / Regulatory" },
  { key: "military-affiliated", label: "Military Affiliated", category: "National Security" },
  { key: "money-laundering-risk", label: "Money Laundering Risk", category: "Financial / Illicit" },

  { key: "monitoring-required", label: "Monitoring Required", category: "Operational / Analytic" },
  { key: "network-hub", label: "Network Hub", category: "Operational / Analytic" },
  { key: "nuclear-related", label: "Nuclear Related", category: "Proliferation" },
  { key: "offshore-structure", label: "Offshore Structure", category: "Financial / Illicit" },
  { key: "opaque-ownership", label: "Opaque Ownership", category: "Financial / Illicit" },
  { key: "parallel-investigation", label: "Parallel Investigation", category: "Investigation / Case" },
  { key: "politically-exposed-person", label: "Politically Exposed Person", category: "Governance / Influence" },
  { key: "policy-influence", label: "Policy Influence", category: "Governance / Influence" },
  { key: "proliferation-risk", label: "Proliferation Risk", category: "Proliferation" },

  { key: "reassessment-needed", label: "Reassessment Needed", category: "Operational / Analytic" },
  { key: "regulatory-review", label: "Regulatory Review", category: "Legal / Regulatory" },
  { key: "restricted-party", label: "Restricted Party", category: "Legal / Regulatory" },
  { key: "sanctions", label: "Sanctions Exposure", category: "Legal / Regulatory" },
  { key: "sanctions-evasion", label: "Sanctions Evasion", category: "Financial / Illicit" },
  { key: "semiconductor-relevant", label: "Semiconductor Relevant", category: "Cyber / Technology" },
  { key: "shell-company", label: "Shell Company", category: "Financial / Illicit" },
  { key: "state-affiliated", label: "State Affiliated", category: "National Security" },
  { key: "state-owned", label: "State Owned", category: "National Security" },
  { key: "strategic-technology", label: "Strategic Technology", category: "National Security" },
  { key: "supply-chain-risk", label: "Supply Chain Risk", category: "Cyber / Technology" },

  { key: "terrorist-financing-risk", label: "Terrorist Financing Risk", category: "Financial / Illicit" },
  { key: "time-sensitive", label: "Time Sensitive", category: "Operational / Analytic" },
  { key: "under-investigation", label: "Under Investigation", category: "Investigation / Case" },
  { key: "weapons-related", label: "Weapons Related", category: "Proliferation" },
] as const;

export type RiskFlagKey = (typeof RISK_FLAGS)[number]["key"];
