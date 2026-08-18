import type { Backend, SovereigntyTier, TierInfo } from "./types";

/**
 * Sovereignty tiers, grounded in the NZ cloud landscape as of mid-2026:
 *
 * - Azure New Zealand North (Auckland) — GA December 2024, three availability zones.
 * - AWS Asia Pacific (New Zealand), ap-southeast-6 — GA September 2025, three AZs.
 * - Google Cloud's Auckland region — announced, not yet GA.
 * - Catalyst Cloud — NZ-owned and operated 10+ years, OpenStack, ISO 27001/27017,
 *   PCI-DSS, on the All-of-Government Cloud Framework. Its Cove platform serves
 *   curated open-source LLMs as a fully managed service on 100% NZ infrastructure.
 *
 * Both US hyperscalers give data *residency*, not *sovereignty*: as US-owned
 * entities they remain subject to the US CLOUD Act even for data held in-country.
 */
export const TIERS: TierInfo[] = [
  {
    tier: "S",
    name: "Sovereign",
    tagline: "Full NZ jurisdiction — NZ-owned, NZ-operated, NZISM-aligned.",
    jurisdiction: "New Zealand only",
    cloudActExposed: false,
    audience: "Public sector, health, iwi/Māori data, regulated industries",
  },
  {
    tier: "R",
    name: "Resident",
    tagline: "In-country hyperscaler regions — residency, not sovereignty.",
    jurisdiction: "New Zealand facilities, US legal exposure (CLOUD Act)",
    cloudActExposed: true,
    audience: "Commercial workloads wanting hyperscaler breadth (Azure OpenAI, Bedrock)",
  },
  {
    tier: "G",
    name: "Global",
    tagline: "Any region, cost/feature-optimised, no residency guarantee.",
    jurisdiction: "Global",
    cloudActExposed: true,
    audience: "Non-sensitive workloads optimising for cost or frontier features",
  },
];

export const BACKENDS: Backend[] = [
  {
    id: "catalyst-cloud",
    name: "Catalyst Cloud (Cove)",
    tier: "S",
    status: "ga",
    region: "nz-hlz-1 / nz-por-1 (Hamilton, Porirua)",
    ownership: "nz",
    cloudActExposed: false,
    certifications: ["ISO 27001", "ISO 27017", "PCI-DSS", "AoG Cloud Framework"],
    aiServices: [
      "Cove managed open-source LLMs (sovereign inference API)",
      "Local fine-tuning",
      "OpenStack compute/object storage for RAG pipelines",
    ],
    notes:
      "NZ-owned and operated for over a decade. Cove provides production-ready sovereign LLM inference — the platform orchestrates on top; no GPUs to front.",
  },
  {
    id: "azure-nz-north",
    name: "Azure New Zealand North",
    tier: "R",
    status: "ga",
    region: "New Zealand North (Auckland, 3 AZs) — GA Dec 2024",
    ownership: "us",
    cloudActExposed: true,
    certifications: ["ISO 27001", "SOC 2", "NZISM-assessed services"],
    aiServices: ["Azure OpenAI Service", "AI Search", "Document Intelligence"],
    notes:
      "In-country residency with hyperscaler breadth. US-owned, so the US CLOUD Act applies despite the Auckland facilities.",
  },
  {
    id: "aws-ap-southeast-6",
    name: "AWS Asia Pacific (New Zealand)",
    tier: "R",
    status: "ga",
    region: "ap-southeast-6 (Auckland, 3 AZs) — GA Sep 2025",
    ownership: "us",
    cloudActExposed: true,
    certifications: ["ISO 27001", "SOC 2", "IRAP (AU)"],
    aiServices: ["Amazon Bedrock", "OpenSearch", "Textract"],
    notes:
      "In-country residency with the AWS service catalog. US-owned, so the US CLOUD Act applies despite the Auckland region.",
  },
  {
    id: "gcp-nz",
    name: "Google Cloud New Zealand",
    tier: "R",
    status: "announced",
    region: "Auckland (announced, not yet GA)",
    ownership: "us",
    cloudActExposed: true,
    certifications: [],
    aiServices: ["Vertex AI (once GA)"],
    notes: "Announced but not generally available as of mid-2026. Roadmap only.",
  },
  {
    id: "azure-global",
    name: "Azure (global regions)",
    tier: "G",
    status: "ga",
    region: "Any (typically Australia East / Southeast Asia)",
    ownership: "global",
    cloudActExposed: true,
    certifications: ["ISO 27001", "SOC 2"],
    aiServices: ["Azure OpenAI Service", "full Azure catalog"],
    notes: "No residency guarantee. Cost/feature-optimised.",
  },
  {
    id: "aws-global",
    name: "AWS (global regions)",
    tier: "G",
    status: "ga",
    region: "Any (typically ap-southeast-2 Sydney)",
    ownership: "global",
    cloudActExposed: true,
    certifications: ["ISO 27001", "SOC 2"],
    aiServices: ["Amazon Bedrock", "full AWS catalog"],
    notes: "No residency guarantee. Cost/feature-optimised.",
  },
  {
    id: "gcp-global",
    name: "Google Cloud (global regions)",
    tier: "G",
    status: "ga",
    region: "Any (typically australia-southeast1 Sydney)",
    ownership: "global",
    cloudActExposed: true,
    certifications: ["ISO 27001", "SOC 2"],
    aiServices: ["Vertex AI", "Gemini API"],
    notes: "No residency guarantee. Cost/feature-optimised.",
  },
];

export function getBackend(id: string): Backend | undefined {
  return BACKENDS.find((b) => b.id === id);
}

export function backendsForTier(tier: SovereigntyTier): Backend[] {
  return BACKENDS.filter((b) => b.tier === tier && b.status === "ga");
}

export function getTierInfo(tier: SovereigntyTier): TierInfo {
  const info = TIERS.find((t) => t.tier === tier);
  if (!info) throw new Error(`Unknown tier: ${tier}`);
  return info;
}
