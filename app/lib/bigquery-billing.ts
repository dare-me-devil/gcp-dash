import { BigQuery } from "@google-cloud/bigquery";

import { BillingSnapshot, TimeRange } from "@/app/types/billing";
import { StoredBigQueryConfig, validateIdentifier } from "@/app/lib/config-store";

const rangeToInterval: Record<TimeRange, string> = {
  "24h": "INTERVAL 24 HOUR",
  "7d": "INTERVAL 7 DAY",
  "30d": "INTERVAL 30 DAY"
};

interface RawTrendRow {
  ts: Date;
  cost: number;
}

interface RawServiceRow {
  service: string;
  cost: number;
}

interface RawTableRow {
  project: string;
  service: string;
  cost: number;
  previous_cost: number;
}

function createClient(config: StoredBigQueryConfig): BigQuery {
  const credentials = JSON.parse(config.serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };

  return new BigQuery({
    projectId: config.projectId,
    credentials
  });
}

function assertValidConfig(config: StoredBigQueryConfig) {
  if (!validateIdentifier(config.dataset) || !validateIdentifier(config.table)) {
    throw new Error("Dataset and table can only contain letters, numbers, underscore, and hyphen.");
  }
}

export async function fetchBillingFromBigQuery(range: TimeRange, config: StoredBigQueryConfig): Promise<BillingSnapshot> {
  assertValidConfig(config);
  const client = createClient(config);
  const tablePath = `\`${config.projectId}.${config.dataset}.${config.table}\``;
  const interval = rangeToInterval[range];
  const previousInterval = range === "24h" ? "INTERVAL 48 HOUR" : range === "7d" ? "INTERVAL 14 DAY" : "INTERVAL 60 DAY";

  const trendQuery = `
    SELECT
      TIMESTAMP_TRUNC(usage_start_time, ${range === "24h" ? "HOUR" : "DAY"}) AS ts,
      ROUND(SUM(cost), 2) AS cost
    FROM ${tablePath}
    WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), ${interval})
    GROUP BY ts
    ORDER BY ts
  `;

  const serviceQuery = `
    SELECT
      service.description AS service,
      ROUND(SUM(cost), 2) AS cost
    FROM ${tablePath}
    WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), ${interval})
    GROUP BY service
    ORDER BY cost DESC
    LIMIT 8
  `;

  const tableQuery = `
    WITH recent AS (
      SELECT
        project.name AS project,
        service.description AS service,
        SUM(cost) AS cost
      FROM ${tablePath}
      WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), ${interval})
      GROUP BY project, service
    ),
    previous AS (
      SELECT
        project.name AS project,
        service.description AS service,
        SUM(cost) AS cost
      FROM ${tablePath}
      WHERE usage_start_time BETWEEN TIMESTAMP_SUB(CURRENT_TIMESTAMP(), ${previousInterval})
        AND TIMESTAMP_SUB(CURRENT_TIMESTAMP(), ${interval})
      GROUP BY project, service
    )
    SELECT
      r.project,
      r.service,
      ROUND(r.cost, 2) AS cost,
      ROUND(COALESCE(p.cost, 0), 2) AS previous_cost
    FROM recent r
    LEFT JOIN previous p
      ON r.project = p.project AND r.service = p.service
    ORDER BY cost DESC
    LIMIT 12
  `;

  const [trendRows] = await client.query<RawTrendRow>({ query: trendQuery });
  const [serviceRows] = await client.query<RawServiceRow>({ query: serviceQuery });
  const [tableRows] = await client.query<RawTableRow>({ query: tableQuery });

  const trend = trendRows.map((row) => ({
    timestamp: new Date(row.ts).getTime(),
    cost: Number(row.cost ?? 0)
  }));

  const totalCost = Number(trend.reduce((sum, point) => sum + point.cost, 0).toFixed(2));
  const avgHourlyBurn = trend.length > 0 ? Number((totalCost / Math.max(1, trend.length)).toFixed(2)) : 0;

  const byService = serviceRows.map((row) => ({
    name: row.service || "Unknown",
    cost: Number(row.cost ?? 0)
  }));

  return {
    range,
    updatedAt: new Date().toISOString(),
    metrics: {
      totalCost,
      projectedMonthEnd: Number((totalCost * 1.1).toFixed(2)),
      avgHourlyBurn,
      budgetUsagePct: 0
    },
    trend,
    byService,
    tableRows: tableRows.map((row) => {
      const current = Number(row.cost ?? 0);
      const previous = Number(row.previous_cost ?? 0);
      const deltaPct = previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(2)) : 0;
      return {
        project: row.project || "unknown-project",
        service: row.service || "Unknown",
        cost: current,
        deltaPct
      };
    })
  };
}
