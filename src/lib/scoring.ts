// Deterministic scoring — pure function, unit-testable.
// Every requirement has: id, label, must_have (bool), weight (1..5).
// Evidence: { requirement_id, present: 'yes' | 'partial' | 'no', excerpt?: string, confidence: 'high'|'medium'|'low' }

export type Requirement = {
  id: string;
  label: string;
  must_have: boolean;
  weight: number; // 1..5
};

export type Evidence = {
  requirement_id: string;
  present: "yes" | "partial" | "no";
  excerpt?: string;
  confidence: "high" | "medium" | "low";
  reasoning?: string;
};

export type ScoreBreakdown = {
  overall_score: number; // 0..100
  overall_confidence: "high" | "medium" | "low";
  gated_by_must_have: boolean;
  requirement_breakdown: Array<Requirement & Evidence & { contribution: number }>;
};

const PRESENT_VALUE = { yes: 1, partial: 0.5, no: 0 } as const;

export function computeScore(reqs: Requirement[], evidences: Evidence[]): ScoreBreakdown {
  const byId = new Map(evidences.map((e) => [e.requirement_id, e]));
  let totalWeight = 0;
  let earned = 0;
  let gated = false;
  const rows = reqs.map((r) => {
    const e =
      byId.get(r.id) ??
      ({ requirement_id: r.id, present: "no", confidence: "low" } as Evidence);
    const val = PRESENT_VALUE[e.present];
    if (r.must_have && val < 1) gated = true;
    const contribution = r.weight * val;
    totalWeight += r.weight;
    earned += contribution;
    return { ...r, ...e, contribution };
  });

  let overall = totalWeight === 0 ? 0 : (earned / totalWeight) * 100;
  if (gated) overall = Math.min(overall, 40); // must-have miss caps at 40

  // Confidence: majority of evidence confidence, downgraded if many "low"
  const lowCount = rows.filter((r) => r.confidence === "low").length;
  const highCount = rows.filter((r) => r.confidence === "high").length;
  let confidence: "high" | "medium" | "low" = "medium";
  if (lowCount > rows.length / 2) confidence = "low";
  else if (highCount > rows.length / 2) confidence = "high";

  return {
    overall_score: Math.round(overall * 100) / 100,
    overall_confidence: confidence,
    gated_by_must_have: gated,
    requirement_breakdown: rows,
  };
}

// Verify that each cited excerpt actually appears in the resume text.
// Excerpts that don't appear are downgraded to 'no' (prevents fabrication).
export function verifyEvidence(evidences: Evidence[], resumeText: string): Evidence[] {
  const normalized = resumeText.toLowerCase().replace(/\s+/g, " ");
  return evidences.map((e) => {
    if (!e.excerpt || e.present === "no") return e;
    const excerpt = e.excerpt.toLowerCase().replace(/\s+/g, " ").trim();
    if (excerpt.length < 6) return e;
    // Allow partial match: 12+ char substring
    const probe = excerpt.slice(0, Math.min(60, excerpt.length));
    if (normalized.includes(probe.slice(0, 24))) return e;
    return { ...e, present: "no", confidence: "low", reasoning: "Excerpt not found in resume" };
  });
}
