import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kaitiaki Cloud — Sovereignty-tiered AI managed services for Aotearoa",
  description:
    "Pick your posture: Sovereign, Resident or Global. Governed AI landing zones deployed into your own cloud account, every deployment rated with the Kaitiaki Score.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-mark">◆</span> Kaitiaki Cloud
          </Link>
          <nav>
            <Link href="/catalog">Workload catalog</Link>
            <Link href="/deploy">Deploy</Link>
            <Link href="/deployments">Deployments</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <p>
            Kaitiaki Cloud — data sovereignty as a selectable posture. Built on Catalyst
            Cloud (Cove), Azure New Zealand North and AWS ap-southeast-6.
          </p>
        </footer>
      </body>
    </html>
  );
}
