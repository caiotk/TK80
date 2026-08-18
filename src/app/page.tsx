import Link from "next/link";
import { TIERS, backendsForTier } from "@/lib/backends";
import { CATALOG } from "@/lib/catalog";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="kicker">AI managed services · Aotearoa New Zealand</div>
        <h1>Data sovereignty as a selectable posture.</h1>
        <p className="lede">
          Deploy governed AI landing zones into <em>your own</em> cloud account — Sovereign,
          Resident or Global — with the Named Guardian Model and a Kaitiaki Score attached to
          every deployment. Residency is not sovereignty; we sell the clarity, then the
          infrastructure to act on it.
        </p>
        <p style={{ marginTop: "1.4rem", display: "flex", gap: "0.8rem" }}>
          <Link className="btn" href="/deploy">
            Deploy a workload
          </Link>
          <Link className="btn secondary" href="/catalog">
            Browse the catalog
          </Link>
        </p>
      </section>

      <h2>Pick your posture</h2>
      <div className="table-wrap">
        <table className="tier-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Backends (GA today)</th>
              <th>Who it&rsquo;s for</th>
              <th>Jurisdiction</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => (
              <tr key={t.tier}>
                <td>
                  <span className={`badge tier-${t.tier}`}>
                    {t.tier} — {t.name}
                  </span>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
                    {t.tagline}
                  </div>
                </td>
                <td>
                  {backendsForTier(t.tier).map((b) => (
                    <div key={b.id}>{b.name}</div>
                  ))}
                </td>
                <td>{t.audience}</td>
                <td>{t.jurisdiction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="notice">
        <strong>Why this works now:</strong> Azure New Zealand North went GA in December 2024,
        AWS ap-southeast-6 in September 2025, and Catalyst Cloud&rsquo;s Cove serves sovereign
        open-source LLMs on 100% NZ infrastructure. For the first time, all three sovereignty
        postures are live in-country — but only Tier S escapes the US CLOUD Act. Most buyers
        don&rsquo;t know the difference between residency and sovereignty. We make it a toggle.
      </div>

      <h2>The workload menu</h2>
      <div className="grid">
        {CATALOG.map((w) => (
          <div className="card" key={w.id}>
            <h3>
              {w.name} {w.hero && <span className="badge hero-badge">HERO SKU</span>}
            </h3>
            <p>{w.description}</p>
            <div className="meta">
              From NZ${w.managementFeeNzd.toLocaleString()}/mo management fee · consumption
              billed to your account
            </div>
          </div>
        ))}
      </div>

      <h2>How &ldquo;near-zero&rdquo; stays real</h2>
      <p className="lede" style={{ fontSize: "0.95rem" }}>
        We never front the compute. Workloads deploy into your cloud account via delegated
        access — cross-tenant app registration in Entra, cross-account IAM role in AWS,
        application credentials in Catalyst. Consumption hits your bill; our control plane
        orchestrates Terraform through GitOps pipelines and attaches the governance layer:
        audit logging, DLP, hard budget caps, a named accountable guardian, and the Kaitiaki
        Score. Governance is not optional — it <em>is</em> the landing zone.
      </p>
    </>
  );
}
