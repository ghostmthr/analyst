/**
 * Shared validation for confidence and rationale.
 * Rule: rationale is REQUIRED when confidence.score >= 0.75 OR <= 0.35.
 */

export function requiresRationale(score: number): boolean {
  return score >= 0.75 || score <= 0.35;
}

export interface ValidateConfidenceResult {
  ok: boolean;
  message?: string;
}

/**
 * Validates a confidence value: score in [0,1] and rationale required at extremes.
 */
export function validateConfidence(conf: {
  score: number;
  rationale?: string | null;
}): ValidateConfidenceResult {
  if (typeof conf.score !== "number" || conf.score < 0 || conf.score > 1) {
    return { ok: false, message: "Confidence must be between 0 and 1." };
  }
  if (requiresRationale(conf.score)) {
    const rationale = conf.rationale?.trim();
    if (!rationale) {
      return {
        ok: false,
        message: "Rationale is required when confidence is high (≥75%) or low (≤35%).",
      };
    }
  }
  return { ok: true };
}
