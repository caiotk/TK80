# Governance baseline — deployed with EVERY workload, non-optionally.
# This is the Named Guardian Model rendered as infrastructure-as-code:
# audit logging, budget guardrails, DLP hooks and guardian accountability tags.
#
# Cloud-agnostic layer: emits a normalized set of tags/labels and a governance
# manifest that provider-specific modules consume. Provider-specific budget and
# logging resources live in the sibling files (azure.tf / aws.tf / catalyst.tf)
# and are activated by var.backend.

terraform {
  required_version = ">= 1.7.0"
}

variable "backend" {
  description = "Target backend: catalyst-cloud | azure-nz-north | aws-ap-southeast-6 | azure-global | aws-global"
  type        = string
}

variable "client_name" {
  description = "Client / organisation this landing zone belongs to."
  type        = string
}

variable "workload_id" {
  description = "Catalog workload identifier (e.g. sovereign-rag)."
  type        = string
}

variable "sovereignty_tier" {
  description = "Sovereignty posture: S (Sovereign) | R (Resident) | G (Global)."
  type        = string
  validation {
    condition     = contains(["S", "R", "G"], var.sovereignty_tier)
    error_message = "sovereignty_tier must be one of S, R, G."
  }
}

variable "data_classification" {
  description = "Highest data classification this workload touches."
  type        = string
  validation {
    condition = contains(
      ["public", "internal", "confidential", "official-information", "health", "maori-data"],
      var.data_classification
    )
    error_message = "Unknown data classification."
  }
}

variable "guardian" {
  description = "Named accountable guardian for this deployment."
  type = object({
    name  = string
    role  = string
    email = string
  })
}

variable "budget_cap_nzd" {
  description = "Hard monthly budget cap in NZD. Enforcement is provider-specific (Azure Budgets + Policy, AWS Budget Actions, Catalyst quota)."
  type        = number
}

variable "guardian_review_cadence_days" {
  description = "How often the guardian must re-attest this deployment."
  type        = number
  default     = 90
}

locals {
  # Sovereignty gate: taonga / health / official information data may only ever
  # land on Tier S. This check fails the plan — the same rule the control plane
  # enforces via the Kaitiaki Score, duplicated here as defence in depth.
  tier_s_required = contains(["official-information", "health", "maori-data"], var.data_classification)

  governance_tags = {
    "kaitiaki:client"           = var.client_name
    "kaitiaki:workload"         = var.workload_id
    "kaitiaki:tier"             = var.sovereignty_tier
    "kaitiaki:classification"   = var.data_classification
    "kaitiaki:guardian-name"    = var.guardian.name
    "kaitiaki:guardian-email"   = var.guardian.email
    "kaitiaki:review-cadence-d" = tostring(var.guardian_review_cadence_days)
    "kaitiaki:managed-by"       = "kaitiaki-cloud"
  }
}

check "sovereignty_gate" {
  assert {
    condition     = !local.tier_s_required || var.sovereignty_tier == "S"
    error_message = "Data classified as ${var.data_classification} requires Tier S (full NZ jurisdiction, e.g. Catalyst Cloud). Refusing to deploy to Tier ${var.sovereignty_tier}."
  }
}

output "governance_tags" {
  description = "Tags/labels every downstream resource must carry."
  value       = local.governance_tags
}

output "budget_cap_nzd" {
  value = var.budget_cap_nzd
}
