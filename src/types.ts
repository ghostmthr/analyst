/**
 * Analyst case file types — matches docs schema.
 * Minimal, explicit, patch-friendly, analysis-grade.
 */

export type ISODate = string;
export type ISODateTime = string;

export type CaseStatus = "ACTIVE" | "ARCHIVED";

export interface CaseFile {
  schema_version: "2.0.0";
  system_version: string;
  case: CaseMeta;
  investigations: Investigation[];
  entities: Entity[];
  identifiers: Identifier[];
  evidence: Evidence[];
  claims: Claim[];
  relationships: Relationship[];
  events: TimelineEvent[];
  analysis: AnalysisWorkspace;
}

export interface CaseMeta {
  id: string;
  title: string;
  status: CaseStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  lead_analyst?: string;
  notes?: string;
}

export type InvestigationStatus = "ACTIVE" | "RESOLVED" | "ARCHIVED";

export interface Investigation {
  id: string;
  title: string;
  description?: string;
  status: InvestigationStatus;
  lead?: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  scope?: {
    time_range?: { from: ISODate | null; to: ISODate | null };
    tags?: string[];
    locations?: string[];
  };
  entity_ids: string[];
  hypothesis_group_ids: string[];
}

export type EntityType =
  | "PERSON"
  | "ORG"
  | "INFRA"
  | "ASSET"
  | "EVENT"
  | "FIN_INSTRUMENT"
  | "GOV";

export interface Entity {
  id: string;
  investigation_id: string;
  type: EntityType;
  name: string;
  description?: string;
  summary?: string;
  attributes?: {
    nationality_iso?: string;
    /** @deprecated Use `roles`. Still read for backward compatibility. */
    current_role?: string;
    roles?: string[];
    /** @deprecated Use `current_organization_entity_ids`. Still read for backward compatibility. */
    current_organization_entity_id?: string;
    current_organization_entity_ids?: string[];
    ein?: string;
    company_type?: string;
  };
  risk_tags?: string[];
  locations?: LocationRef[];
  evidence_ids?: string[];
  image_evidence_ids?: string[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
  created_by?: string;
  updated_by?: string;
}

export type Geometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] };

export type LocationMethod = "manual" | "geocode" | "evidence-derived";

export interface LocationRef {
  id: string;
  label: string;
  geometry: Geometry;
  accuracy_m?: number | null;
  radius_m?: number | null;
  method?: LocationMethod;
  captured_at?: ISODateTime;
  evidence_ids?: string[];
  notes?: string;
}

export type ConfidenceBucket = "LOW" | "MODERATE" | "HIGH";

export interface Confidence {
  sq?: number;
  es?: number;
  cor?: number;
  ac?: number;
  score: number;
  bucket: ConfidenceBucket;
  rationale?: string;
}

export type ExIdentifierType =
  | "ALIAS"
  | "DOMAIN"
  | "IP"
  | "EMAIL"
  | "WALLET"
  | "HANDLE"
  | "ASN"
  | `CUSTOM:${string}`;

export interface Identifier {
  id: string;
  investigation_id: string;
  entity_id: string;
  type: ExIdentifierType;
  value: string;
  source_text?: string;
  source_evidence_ids?: string[];
  first_observed_at?: ISODateTime;
  last_observed_at?: ISODateTime | null;
  is_primary?: boolean;
  confidence?: Confidence;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type EvidenceType = "DOCUMENT" | "IMAGE" | "VIDEO" | "WEB_CAPTURE" | "OTHER";
export type EvidenceSourceType =
  | "SEC"
  | "IRS_FILING"
  | "GOV_CORRESPONDENCE"
  | "WEBSITE"
  | "SOCIAL"
  | "FOIA"
  | "COURT"
  | "NEWS"
  | "PRESS_RELEASE"
  | "REGULATORY"
  | "DATA_BROKER"
  | "PATENT"
  | "INTERVIEW"
  | "LEAK"
  | "SATELLITE"
  | "OTHER";

export interface Evidence {
  id: string;
  investigation_id: string;
  type: EvidenceType;
  title: string;
  description?: string;
  source: {
    source_url?: string;
    source_type: EvidenceSourceType;
    captured_at: ISODateTime;
    published_at?: ISODateTime | null;
    collected_by?: string;
    method?: "download" | "screenshot" | "archive" | "manual";
  };
  file?: {
    path: string;
    sha256: string;
    size_bytes: number;
    mime: string;
  };
  reliability?: {
    source_quality?: number;
    credibility?: number;
    notes?: string;
  };
  analyst_note?: string;
  tags?: string[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Claim {
  id: string;
  investigation_id: string;
  entity_ids?: string[];
  title?: string;
  text: string;
  tags?: string[];
  evidence_ids?: string[];
  confidence?: Confidence;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Minimal claim shape for dropdowns/pickers that only need id and text. */
export type ClaimOption = Pick<Claim, "id" | "text">;

export type RelationshipSource = "ANALYST" | "EVIDENCE";

export type RelationshipType =
  | "OWNS"
  | "CONTROLS"
  | "PAID"
  | "REGISTERED"
  | "EMPLOYS"
  | "EMPLOYED_BY"
  | "HOSTED_BY"
  | "COMMUNICATED_WITH"
  | "AFFILIATED_WITH"
  | "SUBSIDIARY_OF"
  | "PARTNER_OF"
  | "FUNDED_BY"
  | "OPERATES"
  | "MEMBER_OF"
  | "KNOWS"
  | "RELATED_TO"
  | `CUSTOM:${string}`;

export interface Relationship {
  id: string;
  investigation_id: string;
  from_entity_id: string;
  to_entity_id: string;
  type: RelationshipType;
  source: RelationshipSource;
  evidence_ids?: string[];
  time?: { from: ISODate | null; to: ISODate | null };
  confidence?: Confidence;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type EventType =
  | "CORPORATE"
  | "FINANCIAL"
  | "REGULATORY"
  | "TECHNICAL"
  | "PERSONAL"
  | "INTELLIGENCE_RELEVANT";

export interface TimelineEvent {
  id: string;
  investigation_id: string;
  date: ISODate;
  type: EventType;
  title?: string;
  text: string;
  entity_ids?: string[];
  claim_ids?: string[];
  evidence_ids?: string[];
  location?: LocationRef;
  confidence?: Confidence;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface AnalysisWorkspace {
  hypothesis_groups: HypothesisGroup[];
  hypotheses: Hypothesis[];
  diagnostic_claims: DiagnosticClaim[];
  ach_matrices: AchMatrix[];
  assessments: AssessmentSummary[];
}

export type HypothesisGroupStatus = "ACTIVE" | "RESOLVED" | "ARCHIVED";

export interface HypothesisGroup {
  id: string;
  investigation_id: string;
  target_entity_id?: string;
  name: string;
  question: string;
  description?: string;
  status: HypothesisGroupStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type HypothesisStatus = "ACTIVE" | "PARKED" | "REJECTED" | "SUPPORTED" | "ARCHIVED";

export interface Hypothesis {
  id: string;
  hypothesis_group_id: string;
  label: string;
  statement: string;
  status: HypothesisStatus;
  prior_confidence?: { score: number; bucket: ConfidenceBucket; rationale?: string };
  assumptions?: string[];
  falsifiers?: string[];
  collection_gaps?: string[];
  disconfirming?: {
    evidence_ids?: string[];
    claim_ids?: string[];
    notes?: string;
  };
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface DiagnosticClaim {
  id: string;
  hypothesis_group_id: string;
  text: string;
  claim_ids?: string[];
  evidence_ids?: string[];
  weights: {
    diagnosticity: 1 | 2 | 3;
    reliability: number;
    credibility: number;
  };
  confidence?: Confidence;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type AchRelation = "C" | "I" | "NA";

export interface AchCell {
  diagnostic_claim_id: string;
  hypothesis_id: string;
  relation: AchRelation;
  analyst_note?: string;
}

export interface AchComputedResult {
  hypothesis_id: string;
  penalty: number;
  rank: number;
}

export interface AchMatrix {
  id: string;
  hypothesis_group_id: string;
  hypothesis_ids: string[];
  diagnostic_claim_ids: string[];
  cells: AchCell[];
  computed?: {
    version: number;
    algorithm: "ACH_INCONSISTENCY_WEIGHTED_V1";
    results: AchComputedResult[];
    separation: number;
    evidence_coverage: number;
    arc: number;
    sensitivity?: {
      last_run_at?: ISODateTime;
      evidence_id?: string;
      rank_flipped?: boolean;
      separation_drop?: number;
      most_sensitive_evidence_ids?: string[];
      most_sensitive_diagnostic_claim_ids?: string[];
    };
    computed_at: ISODateTime;
  };
}

export interface KeyJudgment {
  text: string;
  confidence: { score: number; bucket: ConfidenceBucket; rationale?: string };
  evidence_ids?: string[];
  claim_ids?: string[];
}

export interface AssessmentSummary {
  id: string;
  hypothesis_group_id: string;
  question: string;
  top_hypothesis_id: string;
  ach_id?: string;
  key_judgments: KeyJudgment[];
  alternative_explanations?: string[];
  intelligence_gaps?: string[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
