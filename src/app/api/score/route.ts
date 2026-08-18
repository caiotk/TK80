import { NextRequest, NextResponse } from "next/server";
import { scoreDeployment } from "@/lib/kaitiaki";
import type { DeploymentRequest } from "@/lib/types";

/**
 * Score a hypothetical deployment without creating it.
 * The deploy wizard calls this live as the user toggles options, so the
 * Kaitiaki Score is visible *before* anything ships.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DeploymentRequest;
    return NextResponse.json(scoreDeployment(body));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 },
    );
  }
}
