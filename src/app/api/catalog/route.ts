import { NextResponse } from "next/server";
import { BACKENDS, TIERS } from "@/lib/backends";
import { CATALOG } from "@/lib/catalog";

export function GET() {
  return NextResponse.json({ tiers: TIERS, backends: BACKENDS, workloads: CATALOG });
}
