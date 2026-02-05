import { NextResponse } from "next/server";

import { fetchBillingFromBigQuery } from "@/app/lib/bigquery-billing";
import { readBigQueryConfig } from "@/app/lib/config-store";
import { fetchBillingSnapshot } from "@/app/lib-simulated-bigquery";
import { TimeRange } from "@/app/types/billing";

function parseRange(value: string | null): TimeRange {
  if (value === "24h" || value === "7d" || value === "30d") {
    return value;
  }

  return "7d";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));
  const config = await readBigQueryConfig();

  if (!config) {
    const demoSnapshot = await fetchBillingSnapshot(range);
    return NextResponse.json({ source: "simulated", snapshot: demoSnapshot, isConfigured: false });
  }

  try {
    const snapshot = await fetchBillingFromBigQuery(range, config);
    return NextResponse.json({ source: "bigquery", snapshot, isConfigured: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to query BigQuery";
    return NextResponse.json({ message, isConfigured: true }, { status: 500 });
  }
}
