# Sovereign RAG Assistant — Tier S landing zone on Catalyst Cloud.
#
# Inference is served by Cove, Catalyst Cloud's managed open-source LLM
# platform on 100% NZ infrastructure — we orchestrate on top of it rather
# than fronting GPUs. This module provisions the client-side landing zone:
# object storage for the document corpus, a compute instance for the
# ingestion/embedding pipeline, and network plumbing. Authentication uses
# OpenStack application credentials delegated by the client (their account,
# their bill — the control plane never fronts consumption).

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 3.0"
    }
  }
}

variable "region" {
  description = "Catalyst Cloud region."
  type        = string
  default     = "nz-hlz-1"
}

variable "governance_tags" {
  description = "Tags from the governance-baseline module."
  type        = map(string)
}

variable "cove_endpoint" {
  description = "Cove sovereign LLM inference endpoint URL."
  type        = string
}

variable "cove_model" {
  description = "Curated open-source model to use for generation."
  type        = string
  default     = "llama-3.3-70b-instruct"
}

# Document corpus bucket — the client's source-of-truth documents land here
# before chunking/embedding. Stays in NZ jurisdiction end to end.
resource "openstack_objectstorage_container_v1" "corpus" {
  region = var.region
  name   = "${var.governance_tags["kaitiaki:client"]}-rag-corpus"

  metadata = var.governance_tags
}

# Vector store + ingestion host. MVP runs a single instance with a local
# vector DB (e.g. Qdrant); scale-out swaps this for a managed cluster.
resource "openstack_compute_instance_v2" "rag_pipeline" {
  region      = var.region
  name        = "${var.governance_tags["kaitiaki:client"]}-rag-pipeline"
  image_name  = "ubuntu-24.04-x86_64"
  flavor_name = "c1.c4r8" # 4 vCPU / 8 GB — right-sized for MVP ingestion

  metadata = merge(var.governance_tags, {
    "cove-endpoint" = var.cove_endpoint
    "cove-model"    = var.cove_model
  })
}

output "corpus_container" {
  value = openstack_objectstorage_container_v1.corpus.name
}

output "pipeline_instance_id" {
  value = openstack_compute_instance_v2.rag_pipeline.id
}
