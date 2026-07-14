# Sovereign RAG Assistant — Tier R landing zone on Azure New Zealand North.
#
# In-country residency (Auckland, 3 AZs, GA Dec 2024) with hyperscaler breadth:
# Azure OpenAI for generation, AI Search for retrieval. NOTE: residency is not
# sovereignty — Microsoft is US-owned, so the US CLOUD Act applies. The control
# plane only offers this module for classifications at or below "confidential".
#
# Deployed via cross-tenant app registration (delegated access): the resources
# and the bill belong to the client's subscription.

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "location" {
  type    = string
  default = "newzealandnorth"
}

variable "governance_tags" {
  type = map(string)
}

variable "budget_cap_nzd" {
  description = "Hard monthly budget cap, enforced with an Azure Consumption Budget."
  type        = number
}

resource "azurerm_resource_group" "rag" {
  name     = "rg-${var.governance_tags["kaitiaki:client"]}-sovereign-rag"
  location = var.location
  tags     = var.governance_tags
}

resource "azurerm_storage_account" "corpus" {
  name                            = substr(replace("st${var.governance_tags["kaitiaki:client"]}rag", "-", ""), 0, 24)
  resource_group_name             = azurerm_resource_group.rag.name
  location                        = azurerm_resource_group.rag.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS" # zone-redundant across the 3 Auckland AZs
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  tags                            = var.governance_tags
}

resource "azurerm_search_service" "retrieval" {
  name                = "srch-${var.governance_tags["kaitiaki:client"]}-rag"
  resource_group_name = azurerm_resource_group.rag.name
  location            = azurerm_resource_group.rag.location
  sku                 = "basic"
  tags                = var.governance_tags
}

resource "azurerm_cognitive_account" "openai" {
  name                = "oai-${var.governance_tags["kaitiaki:client"]}-rag"
  resource_group_name = azurerm_resource_group.rag.name
  location            = azurerm_resource_group.rag.location
  kind                = "OpenAI"
  sku_name            = "S0"
  tags                = var.governance_tags
}

# Hard budget cap — CFO-grade spend control. Forecast alert at 80%,
# hard notification at 100%; pair with an Azure Policy deny in production.
resource "azurerm_consumption_budget_resource_group" "cap" {
  name              = "budget-${var.governance_tags["kaitiaki:client"]}-rag"
  resource_group_id = azurerm_resource_group.rag.id
  amount            = var.budget_cap_nzd
  time_grain        = "Monthly"

  time_period {
    start_date = "2026-08-01T00:00:00Z"
  }

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThan"
    threshold_type = "Forecasted"
    contact_emails = [var.governance_tags["kaitiaki:guardian-email"]]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThanOrEqualTo"
    contact_emails = [var.governance_tags["kaitiaki:guardian-email"]]
  }
}

output "resource_group" {
  value = azurerm_resource_group.rag.name
}

output "openai_endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}
