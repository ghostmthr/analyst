/**
 * Confidence engine — deterministic score and bucket.
 * Confidence attaches to assertions, not entities.
 */

import type { Confidence, ConfidenceBucket } from "@/types";

const SQ_WEIGHT = 0.25;
const ES_WEIGHT = 0.35;
const COR_WEIGHT = 0.2;
const AC_WEIGHT = 0.2;

/**
 * Compute deterministic confidence score.
 * score = 0.35*ES + 0.25*SQ + 0.20*COR + 0.20*AC
 */
export function computeConfidenceScore(
  sq: number,
  es: number,
  cor: number,
  ac: number
): number {
  const score = ES_WEIGHT * es + SQ_WEIGHT * sq + COR_WEIGHT * cor + AC_WEIGHT * ac;
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

/**
 * Bucket from numeric score.
 * HIGH ≥ 0.75, MODERATE 0.50–0.74, LOW < 0.50
 */
export function bucketConfidence(score: number): ConfidenceBucket {
  if (score >= 0.75) return "HIGH";
  if (score >= 0.5) return "MODERATE";
  return "LOW";
}

/**
 * Clamp value to [0, 1].
 */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Normalize partial confidence into full Confidence object.
 * Fills score from components if missing; ensures bucket; clamps 0–1.
 */
export function normalizeConfidence(input: Partial<Confidence>): Confidence {
  const sq = input.sq !== undefined ? clamp01(input.sq) : 0.5;
  const es = input.es !== undefined ? clamp01(input.es) : 0.5;
  const cor = input.cor !== undefined ? clamp01(input.cor) : 0.5;
  const ac = input.ac !== undefined ? clamp01(input.ac) : 0.5;
  const score =
    input.score !== undefined ? clamp01(input.score) : computeConfidenceScore(sq, es, cor, ac);
  const bucket = input.bucket ?? bucketConfidence(score);
  return {
    sq,
    es,
    cor,
    ac,
    score,
    bucket,
    rationale: input.rationale,
  };
}

/**
 * Suggest default confidence from evidence presence and reliability.
 * No evidence → 0.40; evidence-backed → 0.60 baseline; high reliability → 0.75.
 */
export function suggestConfidence(params: {
  hasEvidence: boolean;
  evidenceReliability?: { source_quality?: number; credibility?: number }[];
}): Confidence {
  if (!params.hasEvidence) {
    return {
      score: 0.4,
      bucket: "LOW",
    };
  }
  const rel = params.evidenceReliability;
  if (rel && rel.length > 0) {
    const avg =
      rel.reduce((s, r) => s + (r.source_quality ?? 0.5) + (r.credibility ?? 0.5), 0) /
      (rel.length * 2);
    if (avg >= 0.8) {
      return { score: 0.75, bucket: "HIGH" };
    }
  }
  return { score: 0.6, bucket: "MODERATE" };
}
