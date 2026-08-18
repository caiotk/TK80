import { getBackend, getTierInfo } from "./backends";
import type {
  Backend,
  DataClassification,
  DeploymentRequest,
  KaitiakiScore,
  ScoreGrade,
  ScorePillar,
  SovereigntyTier,
} from "./types";

/**
 * The Kaitiaki Score — the accountability rating attached to every deployment.
 *
 * Five pillars, weights summing to 100:
 *
 *   1. Whakapapa o te raraunga (30) — jurisdiction & ownership of the platform
 *      holding the data. Full marks require NZ ownership *and* NZ jurisdiction;
 *      residency without sovereignty earns partial credit.
 *   2. Kaitiakitanga (25) — a named, accountable guardian with a review cadence
 *      (the Named Guardian Model rendered as configuration).
 *   3. Ngā here ture (20) — compliance alignment: certifications of the backend
 *      (ISO 27001 / NZISM / AoG) plus platform guardrails that evidence it.
 *   4. Mana raraunga (15) — classification fit: does the chosen tier honour the
 *      sensitivity of the data? Taonga (Māori data), health and official
 *      information demand Tier S; anything less is a violation, not a nuance.
 *   5. Aroturuki (10) — operational guardrails: audit logging, budget caps, DLP.
 */

const CLASSIFICATION_MIN_TIER: Record<DataClassification, SovereigntyTier> = {
  public: "G",
  internal: "R",
  confidential: "R",
  "official-information": "S",
  health: "S",
  "maori-data": "S",
};

const CLASSIFICATION_LABELS: Record<DataClassification, string> = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  "official-information": "Official information (public sector)",
  health: "Health data",
  "maori-data": "Māori data (taonga)",
};

const TIER_RANK: Record<SovereigntyTier, number> = { S: 3, R: 2, G: 1 };

export function minimumTierFor(classification: DataClassification): SovereigntyTier {
  return CLASSIFICATION_MIN_TIER[classification];
}

export function tierMeetsClassification(
  tier: SovereigntyTier,
  classification: DataClassification,
): boolean {
  return TIER_RANK[tier] >= TIER_RANK[CLASSIFICATION_MIN_TIER[classification]];
}

function jurisdictionPillar(backend: Backend): ScorePillar {
  const weight = 30;
  let earned: number;
  let detail: string;
  if (backend.ownership === "nz" && !backend.cloudActExposed) {
    earned = weight;
    detail = `${backend.name} is NZ-owned and NZ-operated — data sits under New Zealand jurisdiction alone.`;
  } else if (backend.tier === "R") {
    earned = Math.round(weight * 0.55);
    detail = `${backend.name} keeps data in-country, but as a US-owned operator it remains subject to the US CLOUD Act: residency, not sovereignty.`;
  } else {
    earned = Math.round(weight * 0.2);
    detail = `${backend.name} offers no residency guarantee; data may be processed offshore under foreign jurisdiction.`;
  }
  return {
    id: "whakapapa",
    name: "Whakapapa o te raraunga",
    englishName: "Jurisdiction & ownership",
    weight,
    earned,
    detail,
  };
}

function guardianshipPillar(req: DeploymentRequest): ScorePillar {
  const weight = 25;
  let earned = 0;
  const parts: string[] = [];
  if (req.guardian) {
    earned += Math.round(weight * 0.6);
    parts.push(`Named guardian: ${req.guardian.name} (${req.guardian.role}).`);
  } else {
    parts.push("No named guardian — accountability is unassigned.");
  }
  const cadence = req.guardrails.guardianReviewCadenceDays;
  if (cadence !== null && cadence > 0 && cadence <= 90) {
    earned += weight - Math.round(weight * 0.6);
    parts.push(`Guardian review every ${cadence} days.`);
  } else if (cadence !== null && cadence > 90) {
    earned += Math.round(weight * 0.2);
    parts.push(`Review cadence of ${cadence} days is looser than the 90-day standard.`);
  } else {
    parts.push("No review cadence set.");
  }
  return {
    id: "kaitiakitanga",
    name: "Kaitiakitanga",
    englishName: "Named guardianship",
    weight,
    earned,
    detail: parts.join(" "),
  };
}

function compliancePillar(backend: Backend, req: DeploymentRequest): ScorePillar {
  const weight = 20;
  const certScore = Math.min(backend.certifications.length, 4) / 4; // 0..1
  let earned = Math.round(weight * 0.6 * certScore);
  const parts: string[] = [
    backend.certifications.length > 0
      ? `Backend certifications: ${backend.certifications.join(", ")}.`
      : "Backend has no published certifications relevant to this deployment.",
  ];
  if (req.guardrails.encryptionAtRest) {
    earned += Math.round(weight * 0.2);
    parts.push("Encryption at rest enforced.");
  } else {
    parts.push("Encryption at rest not enforced.");
  }
  if (req.guardrails.ssoMfaEnforced) {
    earned += weight - Math.round(weight * 0.6) - Math.round(weight * 0.2);
    parts.push("SSO with MFA enforced at the identity provider.");
  } else {
    parts.push("SSO/MFA not enforced.");
  }
  return {
    id: "nga-here",
    name: "Ngā here ture",
    englishName: "Compliance alignment",
    weight,
    earned: Math.min(earned, weight),
    detail: parts.join(" "),
  };
}

function classificationPillar(
  backend: Backend,
  req: DeploymentRequest,
): { pillar: ScorePillar; violation: string | null } {
  const weight = 15;
  const minTier = CLASSIFICATION_MIN_TIER[req.dataClassification];
  const fits = tierMeetsClassification(backend.tier, req.dataClassification);
  const label = CLASSIFICATION_LABELS[req.dataClassification];
  if (fits) {
    return {
      pillar: {
        id: "mana-raraunga",
        name: "Mana raraunga",
        englishName: "Classification fit",
        weight,
        earned: weight,
        detail: `${label} data on a Tier ${backend.tier} backend meets the minimum posture (Tier ${minTier}).`,
      },
      violation: null,
    };
  }
  const severe =
    req.dataClassification === "maori-data" ||
    req.dataClassification === "health" ||
    req.dataClassification === "official-information";
  return {
    pillar: {
      id: "mana-raraunga",
      name: "Mana raraunga",
      englishName: "Classification fit",
      weight,
      earned: 0,
      detail: `${label} data requires at least Tier ${minTier}, but this deployment targets Tier ${backend.tier}.`,
    },
    violation: severe
      ? `${label} must be held under full NZ jurisdiction (Tier S). Deploying it to ${backend.name} exposes taonga/regulated data to foreign legal process.`
      : `${label} data is below its minimum sovereignty posture (needs Tier ${minTier}, got Tier ${backend.tier}).`,
  };
}

function guardrailsPillar(req: DeploymentRequest): ScorePillar {
  const weight = 10;
  let earned = 0;
  const parts: string[] = [];
  if (req.guardrails.auditLogging) {
    earned += 4;
    parts.push("Audit logging on.");
  } else {
    parts.push("Audit logging off.");
  }
  if (req.guardrails.budgetCapNzd !== null && req.guardrails.budgetCapNzd > 0) {
    earned += 3;
    parts.push(`Hard budget cap at NZ$${req.guardrails.budgetCapNzd.toLocaleString()}/mo.`);
  } else {
    parts.push("No hard budget cap.");
  }
  if (req.guardrails.dlpEnabled) {
    earned += 3;
    parts.push("DLP enabled.");
  } else {
    parts.push("DLP disabled.");
  }
  return {
    id: "aroturuki",
    name: "Aroturuki",
    englishName: "Operational guardrails",
    weight,
    earned,
    detail: parts.join(" "),
  };
}

function gradeFor(total: number, violations: string[]): { grade: ScoreGrade; label: string } {
  // A hard sovereignty violation caps the grade at C regardless of points.
  if (violations.length > 0 && total >= 55) {
    return { grade: "C", label: "Posture violation — grade capped" };
  }
  if (total >= 90) return { grade: "A+", label: "Exemplary kaitiakitanga" };
  if (total >= 80) return { grade: "A", label: "Strong guardianship" };
  if (total >= 65) return { grade: "B", label: "Sound, with gaps" };
  if (total >= 50) return { grade: "C", label: "Material gaps" };
  return { grade: "D", label: "Not fit to hold this data" };
}

function buildRecommendations(req: DeploymentRequest, pillars: ScorePillar[], violations: string[]): string[] {
  const recs: string[] = [];
  if (violations.length > 0) {
    recs.push("Move this workload to a Tier S backend (Catalyst Cloud / Cove) — classification demands full NZ jurisdiction.");
  }
  if (!req.guardian) recs.push("Assign a named guardian — accountability must attach to a person, not a team.");
  if (req.guardrails.guardianReviewCadenceDays === null) {
    recs.push("Set a guardian review cadence (90 days or tighter).");
  }
  if (!req.guardrails.ssoMfaEnforced) recs.push("Enforce SSO + MFA at the identity provider.");
  if (!req.guardrails.auditLogging) recs.push("Enable audit logging — it is the evidence layer for every other control.");
  if (req.guardrails.budgetCapNzd === null) recs.push("Set a hard monthly budget cap to bound AI spend risk.");
  if (!req.guardrails.dlpEnabled) recs.push("Enable DLP on ingestion and inference paths.");
  if (!req.guardrails.encryptionAtRest) recs.push("Enforce encryption at rest.");
  const jurisdiction = pillars.find((p) => p.id === "whakapapa");
  if (jurisdiction && jurisdiction.earned < jurisdiction.weight && violations.length === 0) {
    recs.push("For stronger sovereignty posture, consider Tier S (Catalyst Cloud) — the current backend provides residency but remains CLOUD Act-exposed.");
  }
  return recs;
}

/** Score a deployment request. Pure function — no I/O, fully unit-testable. */
export function scoreDeployment(req: DeploymentRequest): KaitiakiScore {
  const backend = getBackend(req.backendId);
  if (!backend) throw new Error(`Unknown backend: ${req.backendId}`);
  if (backend.status !== "ga") {
    throw new Error(`${backend.name} is not generally available (status: ${backend.status}).`);
  }

  const { pillar: classification, violation } = classificationPillar(backend, req);
  const pillars: ScorePillar[] = [
    jurisdictionPillar(backend),
    guardianshipPillar(req),
    compliancePillar(backend, req),
    classification,
    guardrailsPillar(req),
  ];
  const violations = violation ? [violation] : [];
  const total = pillars.reduce((sum, p) => sum + p.earned, 0);
  const { grade, label } = gradeFor(total, violations);

  return {
    total,
    grade,
    gradeLabel: label,
    pillars,
    violations,
    recommendations: buildRecommendations(req, pillars, violations),
  };
}

export { getTierInfo };
