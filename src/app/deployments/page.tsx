"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBackend } from "@/lib/backends";
import { getWorkload } from "@/lib/catalog";
import type { Deployment } from "@/lib/types";

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[] | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/deployments");
        const body = await res.json();
        if (alive) setDeployments(body.deployments);
      } catch {
        /* transient */
      }
    }
    load();
    const t = setInterval(load, 2_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <>
      <h1>Deployments</h1>
      <p className="lede">
        Live view of workloads the GitOps pipeline is driving into client accounts.
      </p>

      {deployments === null ? (
        <p className="empty">Loading…</p>
      ) : deployments.length === 0 ? (
        <p className="empty">
          No deployments yet. <Link href="/deploy">Deploy your first workload →</Link>
        </p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          {deployments.map((d) => {
            const workload = getWorkload(d.workloadId);
            const backend = getBackend(d.backendId);
            return (
              <div className="card" key={d.id}>
                <h3>
                  {workload?.name ?? d.workloadId} — {d.clientName}{" "}
                  <span className={`badge tier-${d.tier}`}>Tier {d.tier}</span>{" "}
                  <span className={`badge status ${d.status}`}>{d.status}</span>
                </h3>
                <p>
                  {backend?.name ?? d.backendId} · classification:{" "}
                  {d.dataClassification} · guardian:{" "}
                  {d.guardian ? `${d.guardian.name} (${d.guardian.role})` : "none assigned"}
                </p>
                <div className="meta">
                  Kaitiaki Score: <strong>{d.score.total}/100 ({d.score.grade})</strong> —{" "}
                  {d.score.gradeLabel}
                  {d.score.violations.length > 0 && (
                    <div className="violation" style={{ marginTop: "0.6rem" }}>
                      ⚠ {d.score.violations[0]}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: "0.5rem", color: "var(--text-dim)", fontSize: "0.8rem" }}>
                  <span className="mono">{d.id}</span> · created{" "}
                  {new Date(d.createdAt).toLocaleString("en-NZ")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
