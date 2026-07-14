"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BACKENDS, getBackend } from "@/lib/backends";
import { CATALOG, getWorkload } from "@/lib/catalog";
import { minimumTierFor } from "@/lib/kaitiaki";
import type {
  DataClassification,
  DeploymentRequest,
  KaitiakiScore,
} from "@/lib/types";

const CLASSIFICATIONS: { value: DataClassification; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "official-information", label: "Official information (public sector)" },
  { value: "health", label: "Health data" },
  { value: "maori-data", label: "Māori data (taonga)" },
];

export default function DeployWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const initialWorkload = getWorkload(params.get("workload") ?? "")?.id ?? CATALOG[0].id;

  const [workloadId, setWorkloadId] = useState(initialWorkload);
  const [backendId, setBackendId] = useState<string>("catalyst-cloud");
  const [clientName, setClientName] = useState("");
  const [classification, setClassification] = useState<DataClassification>("internal");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRole, setGuardianRole] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [auditLogging, setAuditLogging] = useState(true);
  const [dlpEnabled, setDlpEnabled] = useState(true);
  const [ssoMfaEnforced, setSsoMfaEnforced] = useState(true);
  const [encryptionAtRest, setEncryptionAtRest] = useState(true);
  const [budgetCap, setBudgetCap] = useState<string>("2000");
  const [reviewCadence, setReviewCadence] = useState<string>("90");

  const [score, setScore] = useState<KaitiakiScore | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workload = getWorkload(workloadId)!;
  const availableBackends = useMemo(
    () =>
      BACKENDS.filter(
        (b) => b.status === "ga" && workload.supportedBackends.includes(b.id),
      ),
    [workload],
  );

  useEffect(() => {
    if (!availableBackends.some((b) => b.id === backendId)) {
      setBackendId(availableBackends[0]?.id ?? "");
    }
  }, [availableBackends, backendId]);

  const buildRequest = useCallback((): DeploymentRequest => {
    const guardian =
      guardianName.trim() !== ""
        ? { name: guardianName.trim(), role: guardianRole.trim() || "Guardian", email: guardianEmail.trim() }
        : null;
    return {
      workloadId,
      backendId: backendId as DeploymentRequest["backendId"],
      clientName,
      dataClassification: classification,
      guardian,
      guardrails: {
        auditLogging,
        dlpEnabled,
        ssoMfaEnforced,
        encryptionAtRest,
        budgetCapNzd: budgetCap.trim() === "" ? null : Number(budgetCap),
        guardianReviewCadenceDays: reviewCadence.trim() === "" ? null : Number(reviewCadence),
      },
    };
  }, [
    workloadId, backendId, clientName, classification, guardianName, guardianRole,
    guardianEmail, auditLogging, dlpEnabled, ssoMfaEnforced, encryptionAtRest,
    budgetCap, reviewCadence,
  ]);

  // Live-score the current configuration as the user toggles options.
  useEffect(() => {
    if (!backendId) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequest()),
          signal: controller.signal,
        });
        if (res.ok) setScore(await res.json());
      } catch {
        /* aborted or transient — keep last score */
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [buildRequest, backendId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequest()),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Deployment failed");
      router.push("/deployments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deployment failed");
      setSubmitting(false);
    }
  }

  const minTier = minimumTierFor(classification);
  const selectedBackend = getBackend(backendId as DeploymentRequest["backendId"]);

  return (
    <>
      <h1>Deploy a workload</h1>
      <p className="lede">
        The Kaitiaki Score updates live as you configure — you see the posture rating{" "}
        <em>before</em> anything ships.
      </p>

      <div className="wizard-grid" style={{ marginTop: "1.5rem" }}>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="client">Client / organisation name</label>
            <input
              id="client"
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Te Whatu Ora regional team"
            />
          </div>

          <div className="field">
            <label htmlFor="workload">Workload</label>
            <select id="workload" value={workloadId} onChange={(e) => setWorkloadId(e.target.value)}>
              {CATALOG.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — NZ${w.managementFeeNzd.toLocaleString()}/mo
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="classification">Most sensitive data this workload will touch</label>
            <select
              id="classification"
              value={classification}
              onChange={(e) => setClassification(e.target.value as DataClassification)}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
              Minimum posture for this classification: <strong>Tier {minTier}</strong>
            </p>
          </div>

          <div className="field">
            <label htmlFor="backend">Backend (sovereignty posture)</label>
            <select id="backend" value={backendId} onChange={(e) => setBackendId(e.target.value)}>
              {availableBackends.map((b) => (
                <option key={b.id} value={b.id}>
                  Tier {b.tier} — {b.name}
                </option>
              ))}
            </select>
            {selectedBackend && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                {selectedBackend.notes}
              </p>
            )}
          </div>

          <h2 style={{ marginTop: "1.6rem" }}>Named guardian</h2>
          <div className="field">
            <label htmlFor="gname">Guardian name</label>
            <input id="gname" type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="The person accountable for this data" />
          </div>
          <div className="field">
            <label htmlFor="grole">Role</label>
            <input id="grole" type="text" value={guardianRole} onChange={(e) => setGuardianRole(e.target.value)} placeholder="e.g. CISO, Data Steward, Kaitiaki" />
          </div>
          <div className="field">
            <label htmlFor="gemail">Email</label>
            <input id="gemail" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cadence">Guardian review cadence (days)</label>
            <input id="cadence" type="number" min="1" value={reviewCadence} onChange={(e) => setReviewCadence(e.target.value)} />
          </div>

          <h2 style={{ marginTop: "1.6rem" }}>Guardrails</h2>
          <div className="checkbox-row">
            <input id="audit" type="checkbox" checked={auditLogging} onChange={(e) => setAuditLogging(e.target.checked)} />
            <label htmlFor="audit">Audit logging</label>
          </div>
          <div className="checkbox-row">
            <input id="dlp" type="checkbox" checked={dlpEnabled} onChange={(e) => setDlpEnabled(e.target.checked)} />
            <label htmlFor="dlp">Data loss prevention (DLP)</label>
          </div>
          <div className="checkbox-row">
            <input id="sso" type="checkbox" checked={ssoMfaEnforced} onChange={(e) => setSsoMfaEnforced(e.target.checked)} />
            <label htmlFor="sso">SSO + MFA enforced at the IdP</label>
          </div>
          <div className="checkbox-row">
            <input id="enc" type="checkbox" checked={encryptionAtRest} onChange={(e) => setEncryptionAtRest(e.target.checked)} />
            <label htmlFor="enc">Encryption at rest</label>
          </div>
          <div className="field" style={{ marginTop: "0.8rem" }}>
            <label htmlFor="budget">Hard monthly budget cap (NZD, blank = none)</label>
            <input id="budget" type="number" min="0" value={budgetCap} onChange={(e) => setBudgetCap(e.target.value)} />
          </div>

          {error && <div className="violation">{error}</div>}
          <button type="submit" disabled={submitting || !backendId}>
            {submitting ? "Deploying…" : "Deploy to my account"}
          </button>
        </form>

        <aside className="score-panel">
          <h3>Kaitiaki Score</h3>
          {score ? (
            <>
              <div className="score-headline">
                <span className="score-total">{score.total}</span>
                <span
                  className={`score-grade ${
                    score.grade === "C" ? "warn" : score.grade === "D" ? "bad" : ""
                  }`}
                >
                  {score.grade}
                </span>
              </div>
              <div className="score-label">{score.gradeLabel}</div>
              {score.violations.map((v) => (
                <div className="violation" key={v}>⚠ {v}</div>
              ))}
              {score.pillars.map((p) => (
                <div className="pillar" key={p.id}>
                  <div className="pillar-head">
                    <span>
                      {p.name} <span className="en">· {p.englishName}</span>
                    </span>
                    <span>
                      {p.earned}/{p.weight}
                    </span>
                  </div>
                  <div className="pillar-bar">
                    <div style={{ width: `${(p.earned / p.weight) * 100}%` }} />
                  </div>
                  <div className="pillar-detail">{p.detail}</div>
                </div>
              ))}
              {score.recommendations.length > 0 && (
                <>
                  <h3 style={{ marginTop: "1rem" }}>To improve</h3>
                  <ul className="recommendations">
                    {score.recommendations.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="empty">Configure the deployment to see its score.</p>
          )}
        </aside>
      </div>
    </>
  );
}
