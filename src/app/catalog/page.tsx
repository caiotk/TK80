import Link from "next/link";
import { BACKENDS, getBackend } from "@/lib/backends";
import { CATALOG } from "@/lib/catalog";

export const metadata = { title: "Workload catalog — Kaitiaki Cloud" };

export default function CatalogPage() {
  return (
    <>
      <h1>Workload catalog</h1>
      <p className="lede">
        Each item is a parameterised Terraform module, deployed into your delegated cloud
        account by our GitOps pipeline. The governance guardrail layer ships with every one —
        non-optionally.
      </p>

      <div className="grid">
        {CATALOG.map((w) => (
          <div className="card" key={w.id}>
            <h3>
              {w.name} {w.hero && <span className="badge hero-badge">HERO SKU</span>}
            </h3>
            <p>{w.description}</p>
            <div className="meta">
              <div>
                <strong>Backends:</strong>{" "}
                {w.supportedBackends
                  .map((id) => getBackend(id)?.name ?? id)
                  .join(" · ")}
              </div>
              <div style={{ marginTop: "0.3rem" }}>
                <strong>Module:</strong> <span className="mono">{w.terraformModule}</span>
              </div>
              <div style={{ marginTop: "0.3rem" }}>
                <strong>Management fee:</strong> NZ${w.managementFeeNzd.toLocaleString()}/mo
              </div>
            </div>
            <p style={{ marginTop: "0.9rem" }}>
              <Link className="btn" href={`/deploy?workload=${w.id}`}>
                Deploy →
              </Link>
            </p>
          </div>
        ))}
      </div>

      <h2>Backends</h2>
      <div className="grid">
        {BACKENDS.map((b) => (
          <div className="card" key={b.id}>
            <h3>
              {b.name} <span className={`badge tier-${b.tier}`}>Tier {b.tier}</span>
              {b.status !== "ga" && <span className="badge status">{b.status}</span>}
            </h3>
            <p>{b.notes}</p>
            <div className="meta">
              <div><strong>Region:</strong> {b.region}</div>
              {b.certifications.length > 0 && (
                <div style={{ marginTop: "0.3rem" }}>
                  <strong>Certifications:</strong> {b.certifications.join(", ")}
                </div>
              )}
              <div style={{ marginTop: "0.3rem" }}>
                <strong>AI services:</strong> {b.aiServices.join("; ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
