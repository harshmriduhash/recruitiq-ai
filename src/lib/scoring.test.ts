import { describe, expect, test } from "bun:test";
import { computeScore, verifyEvidence, type Evidence, type Requirement } from "./scoring";

const reqs: Requirement[] = [
  { id: "ts", label: "TypeScript", must_have: true, weight: 5 },
  { id: "react", label: "React", must_have: false, weight: 3 },
  { id: "aws", label: "AWS", must_have: false, weight: 2 },
];
const ev = (id: string, present: Evidence["present"], confidence: Evidence["confidence"] = "high"): Evidence => ({
  requirement_id: id,
  present,
  confidence,
});

describe("computeScore", () => {
  test("perfect match scores 100 with high confidence", () => {
    const r = computeScore(reqs, [ev("ts", "yes"), ev("react", "yes"), ev("aws", "yes")]);
    expect(r.overall_score).toBe(100);
    expect(r.gated_by_must_have).toBe(false);
    expect(r.overall_confidence).toBe("high");
  });

  test("missing must-have gates the score at 40", () => {
    const r = computeScore(reqs, [ev("ts", "no"), ev("react", "yes"), ev("aws", "yes")]);
    expect(r.gated_by_must_have).toBe(true);
    expect(r.overall_score).toBeLessThanOrEqual(40);
  });

  test("partial must-have also gates", () => {
    const r = computeScore(reqs, [ev("ts", "partial"), ev("react", "yes"), ev("aws", "yes")]);
    expect(r.gated_by_must_have).toBe(true);
    expect(r.overall_score).toBe(40);
  });

  test("weights are respected", () => {
    const r = computeScore(reqs, [ev("ts", "yes"), ev("react", "no"), ev("aws", "no")]);
    expect(r.overall_score).toBe(50);
  });

  test("missing evidence counts as no with low confidence", () => {
    const r = computeScore(reqs, []);
    expect(r.overall_score).toBe(0);
    expect(r.overall_confidence).toBe("low");
  });

  test("no requirements yields 0 without throwing", () => {
    expect(computeScore([], []).overall_score).toBe(0);
  });

  test("property: score always within 0..100 and gating never exceeds 40", () => {
    const states: Evidence["present"][] = ["yes", "partial", "no"];
    for (let i = 0; i < 500; i++) {
      const rs: Requirement[] = Array.from({ length: 1 + (i % 8) }, (_, k) => ({
        id: `r${k}`,
        label: `R${k}`,
        must_have: Math.random() < 0.4,
        weight: 1 + Math.floor(Math.random() * 5),
      }));
      const es = rs.map((r) => ev(r.id, states[Math.floor(Math.random() * 3)]));
      const out = computeScore(rs, es);
      expect(out.overall_score).toBeGreaterThanOrEqual(0);
      expect(out.overall_score).toBeLessThanOrEqual(100);
      if (out.gated_by_must_have) expect(out.overall_score).toBeLessThanOrEqual(40);
      // Monotonic: upgrading all evidence to "yes" never lowers the score
      const best = computeScore(rs, rs.map((r) => ev(r.id, "yes")));
      expect(best.overall_score).toBeGreaterThanOrEqual(out.overall_score);
    }
  });
});

describe("verifyEvidence", () => {
  const resume = "Built   scalable React apps with TypeScript at Acme for 5 years.";
  test("keeps excerpts that appear in the resume (whitespace-insensitive)", () => {
    const [e] = verifyEvidence([{ ...ev("react", "yes"), excerpt: "Built scalable React apps" }], resume);
    expect(e.present).toBe("yes");
  });
  test("downgrades fabricated excerpts", () => {
    const [e] = verifyEvidence([{ ...ev("aws", "yes"), excerpt: "Led AWS migration for 200 services" }], resume);
    expect(e.present).toBe("no");
    expect(e.confidence).toBe("low");
  });
});
