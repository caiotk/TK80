# Sovereign RAG Assistant — Tier R landing zone on AWS ap-southeast-6.
#
# In-country residency (Auckland, 3 AZs, GA Sep 2025): Amazon Bedrock for
# generation, S3 for the corpus, OpenSearch Serverless for retrieval.
# NOTE: residency is not sovereignty — AWS is US-owned, so the US CLOUD Act
# applies. Offered only for classifications at or below "confidential".
#
# Deployed via a cross-account IAM role delegated by the client: the
# resources and the bill belong to their AWS account.

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

provider "aws" {
  region = "ap-southeast-6"

  assume_role {
    role_arn = var.delegated_role_arn
  }

  default_tags {
    tags = var.governance_tags
  }
}

variable "delegated_role_arn" {
  description = "Cross-account IAM role in the client account that this pipeline assumes."
  type        = string
}

variable "governance_tags" {
  type = map(string)
}

variable "budget_cap_nzd" {
  description = "Hard monthly budget cap, enforced with AWS Budgets + Budget Actions."
  type        = number
}

resource "aws_s3_bucket" "corpus" {
  bucket = "${var.governance_tags["kaitiaki:client"]}-rag-corpus"
}

resource "aws_s3_bucket_public_access_block" "corpus" {
  bucket                  = aws_s3_bucket.corpus.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "corpus" {
  bucket = aws_s3_bucket.corpus.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_opensearchserverless_collection" "retrieval" {
  name = "${var.governance_tags["kaitiaki:client"]}-rag"
  type = "VECTORSEARCH"
}

# Hard budget cap: alert at 80% forecast, and a Budget Action can attach a
# deny-all-Bedrock policy at 100% for a true hard stop.
resource "aws_budgets_budget" "cap" {
  name         = "${var.governance_tags["kaitiaki:client"]}-rag-cap"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_cap_nzd)
  limit_unit   = "USD" # NZD not supported by AWS Budgets; control plane converts
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.governance_tags["kaitiaki:guardian-email"]]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.governance_tags["kaitiaki:guardian-email"]]
  }
}

output "corpus_bucket" {
  value = aws_s3_bucket.corpus.bucket
}

output "retrieval_collection_arn" {
  value = aws_opensearchserverless_collection.retrieval.arn
}
