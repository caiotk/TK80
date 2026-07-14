import { randomUUID } from "node:crypto";
import { getBackend } from "./backends";
import { getWorkload } from "./catalog";
import { scoreDeployment } from "./kaitiaki";
import type { Deployment, DeploymentRequest } from "./types";

/**
 * In-memory deployment store for the MVP control plane.
 *
 * Deliberately tiny: the production path swaps this for a durable store
 * (e.g. SQLite/Postgres) without touching the API surface. Deployments
 * simulate the GitOps pipeline states the GitHub Actions workflow drives
 * in real life: pending → planning → applying → deployed.
 */

const globalStore = globalThis as unknown as { __deployments?: Map<string, Deployment> };
const deployments: Map<string, Deployment> = (globalStore.__deployments ??= new Map());

export function listDeployments(): Deployment[] {
  return [...deployments.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDeployment(id: string): Deployment | undefined {
  return deployments.get(id);
}

export function createDeployment(req: DeploymentRequest): Deployment {
  const workload = getWorkload(req.workloadId);
  if (!workload) throw new Error(`Unknown workload: ${req.workloadId}`);
  const backend = getBackend(req.backendId);
  if (!backend) throw new Error(`Unknown backend: ${req.backendId}`);
  if (!workload.supportedBackends.includes(backend.id)) {
    throw new Error(`${workload.name} does not support backend ${backend.name} yet.`);
  }

  const score = scoreDeployment(req);
  const deployment: Deployment = {
    ...req,
    id: randomUUID(),
    tier: backend.tier,
    status: "pending",
    createdAt: new Date().toISOString(),
    score,
  };
  deployments.set(deployment.id, deployment);
  simulatePipeline(deployment.id);
  return deployment;
}

/** Walk the deployment through pipeline states, as the CI pipeline would. */
function simulatePipeline(id: string) {
  const advance = (status: Deployment["status"], delayMs: number) =>
    setTimeout(() => {
      const d = deployments.get(id);
      if (d && d.status !== "failed") deployments.set(id, { ...d, status });
    }, delayMs);
  advance("planning", 1_500);
  advance("applying", 4_000);
  advance("deployed", 8_000);
}
