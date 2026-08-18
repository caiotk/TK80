import { Suspense } from "react";
import DeployWizard from "./wizard";

export const metadata = { title: "Deploy a workload — Kaitiaki Cloud" };

export default function DeployPage() {
  return (
    <Suspense>
      <DeployWizard />
    </Suspense>
  );
}
