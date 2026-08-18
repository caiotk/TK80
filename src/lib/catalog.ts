import type { WorkloadItem } from "./types";

/**
 * The workload menu — what clients actually click.
 *
 * Every item ships with the governance guardrail layer non-optionally:
 * audit logging, budget guardrails, DLP, a named accountable guardian, and
 * the Kaitiaki Score. That layer *is* the landing zone, not just the model.
 */
export const CATALOG: WorkloadItem[] = [
  {
    id: "sovereign-rag",
    name: "Sovereign RAG Assistant",
    description:
      "Internal knowledge chatbot over your SharePoint / Drive / document stores. Retrieval-augmented generation with the inference layer matched to your sovereignty tier — Cove sovereign LLMs on Tier S, Azure OpenAI or Bedrock on Tier R/G.",
    hero: true,
    supportedBackends: ["catalyst-cloud", "azure-nz-north", "aws-ap-southeast-6", "azure-global", "aws-global"],
    managementFeeNzd: 1490,
    terraformModule: "infra/modules/sovereign-rag",
  },
  {
    id: "document-intelligence",
    name: "Document Intelligence",
    description:
      "OCR, extraction and classification pipeline for structured and unstructured documents, with human-in-the-loop review queues.",
    supportedBackends: ["azure-nz-north", "aws-ap-southeast-6", "catalyst-cloud"],
    managementFeeNzd: 990,
    terraformModule: "infra/modules/document-intelligence",
  },
  {
    id: "meeting-transcription",
    name: "Meeting Transcription + Summarisation",
    description:
      "Automated transcription, action-item extraction and summaries for meetings, delivered to your existing collaboration tools.",
    supportedBackends: ["azure-nz-north", "aws-ap-southeast-6", "catalyst-cloud"],
    managementFeeNzd: 690,
    terraformModule: "infra/modules/meeting-transcription",
  },
  {
    id: "cs-copilot",
    name: "Customer-Service Copilot",
    description:
      "Agent-assist copilot for support teams: suggested replies, knowledge lookup and conversation summarisation over your ticketing history.",
    supportedBackends: ["azure-nz-north", "aws-ap-southeast-6"],
    managementFeeNzd: 1290,
    terraformModule: "infra/modules/cs-copilot",
  },
  {
    id: "fine-tuned-llm",
    name: "Fine-Tuned Open LLM Endpoint",
    description:
      "A dedicated, fine-tuned open-model endpoint — Cove sovereign fine-tuning on Tier S, or Azure OpenAI / Bedrock custom models on Tier R/G.",
    supportedBackends: ["catalyst-cloud", "azure-nz-north", "aws-ap-southeast-6", "azure-global", "aws-global"],
    managementFeeNzd: 1890,
    terraformModule: "infra/modules/fine-tuned-llm",
  },
  {
    id: "vector-analytics",
    name: "Vector DB + Analytics/BI Starter",
    description:
      "Managed vector database with an analytics/BI starter kit — embeddings pipelines, dashboards and semantic search over your data estate.",
    supportedBackends: ["catalyst-cloud", "azure-nz-north", "aws-ap-southeast-6"],
    managementFeeNzd: 890,
    terraformModule: "infra/modules/vector-analytics",
  },
];

export function getWorkload(id: string): WorkloadItem | undefined {
  return CATALOG.find((w) => w.id === id);
}
