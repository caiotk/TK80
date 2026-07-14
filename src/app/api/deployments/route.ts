import { NextRequest, NextResponse } from "next/server";
import { createDeployment, listDeployments } from "@/lib/store";
import type { DeploymentRequest } from "@/lib/types";

export function GET() {
  return NextResponse.json({ deployments: listDeployments() });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DeploymentRequest;
    if (!body.clientName?.trim()) {
      return NextResponse.json({ error: "clientName is required" }, { status: 400 });
    }
    const deployment = createDeployment(body);
    return NextResponse.json(deployment, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 },
    );
  }
}
