/**
 * Core domain types for the Kaitiaki Cloud platform.
 *
 * The central concept is the sovereignty *posture*: every workload is deployed
 * against exactly one tier, and every deployment carries a Kaitiaki Score that
 * rates how well its configuration honours the data it holds.
 */

/** Sovereignty tiers — the "pick your posture" toggle. */
export type SovereigntyTier = "S" | "R" | "G";

export interface TierInfo {
  tier: SovereigntyTier;
  name: string;
  tagline: string;
  jurisdiction: string;
  cloudActExposed: boolean;
  audience: string;
}

/** Cloud backends the orchestrator can target. */
export type BackendId =
  | "catalyst-cloud"
  | "azure-nz-north"
  | "aws-ap-southeast-6"
  | "azure-global"
  | "aws-global"
  | "gcp-global"
  | "gcp-nz"; // announced, not GA — kept for roadmap visibility

export type BackendStatus = "ga" | "announced" | "unavailable";

export interface Backend {
  id: BackendId;
  name: string;
  tier: SovereigntyTier;
  status: BackendStatus;
  region: string;
  ownership: "nz" | "us" | "global";
  /** True when the operating entity is subject to the US CLOUD Act. */
  cloudActExposed: boolean;
  certifications: string[];
  aiServices: string[];
  notes: string;
}

/** Data classifications drive the minimum acceptable tier. */
export type DataClassification =
  | "public"
  | "internal"
  | "confidential"
  | "official-information" // NZ public sector OFFICIAL / IN-CONFIDENCE
  | "health"
  | "maori-data"; // taonga — Māori data sovereignty applies

export interface WorkloadItem {
  id: string;
  name: string;
  description: string;
  hero?: boolean;
  /** Backends this workload's Terraform module currently supports. */
  supportedBackends: BackendId[];
  /** Monthly management fee in NZD (the platform fee, not cloud consumption). */
  managementFeeNzd: number;
  terraformModule: string;
}

/** The named human accountable for a deployment (Named Guardian Model). */
export interface Guardian {
  name: string;
  role: string;
  email: string;
}

/** Governance guardrails shipped (non-optionally) with every landing zone. */
export interface Guardrails {
  auditLogging: boolean;
  budgetCapNzd: number | null; // null = no hard cap configured
  dlpEnabled: boolean;
  ssoMfaEnforced: boolean;
  encryptionAtRest: boolean;
  guardianReviewCadenceDays: number | null; // null = no review cadence set
}

export interface DeploymentRequest {
  workloadId: string;
  backendId: BackendId;
  clientName: string;
  dataClassification: DataClassification;
  guardian: Guardian | null;
  guardrails: Guardrails;
}

export type DeploymentStatus =
  | "pending"
  | "planning"
  | "applying"
  | "deployed"
  | "failed";

export interface Deployment extends DeploymentRequest {
  id: string;
  tier: SovereigntyTier;
  status: DeploymentStatus;
  createdAt: string;
  score: KaitiakiScore;
}

/** One scored pillar of the Kaitiaki Score. */
export interface ScorePillar {
  id: string;
  /** Te reo Māori name of the pillar. */
  name: string;
  englishName: string;
  weight: number; // out of 100, all pillar weights sum to 100
  earned: number; // 0..weight
  detail: string;
}

export type ScoreGrade = "A+" | "A" | "B" | "C" | "D";

export interface KaitiakiScore {
  total: number; // 0..100
  grade: ScoreGrade;
  gradeLabel: string;
  pillars: ScorePillar[];
  /** Hard findings — e.g. taonga data on a CLOUD Act-exposed backend. */
  violations: string[];
  /** Actionable improvements, ordered by score impact. */
  recommendations: string[];
}
