import { BillingSnapshot, TimeRange } from "@/app/types/billing";

const services = ["Compute Engine", "Cloud Storage", "BigQuery", "Cloud Run", "GKE"];
const projects = ["prod-core", "ml-platform", "payments", "analytics", "sandbox"];

const rangeToPoints: Record<TimeRange, number> = {
  "24h": 24,
  "7d": 28,
  "30d": 30
};

export async function fetchBillingSnapshot(range: TimeRange): Promise<BillingSnapshot> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (Math.random() < 0.06) {
    throw new Error("Simulated BigQuery timeout");
  }

  const points = rangeToPoints[range];
  const now = Date.now();
  const step = range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const base = range === "24h" ? 42 : range === "7d" ? 250 : 930;

  const trend = Array.from({ length: points }, (_, i) => {
    const variance = Math.sin(i / 3) * (base * 0.08) + (Math.random() - 0.5) * (base * 0.04);
    return {
      timestamp: now - (points - i - 1) * step,
      cost: Number((base + variance).toFixed(2))
    };
  });

  const totalCost = Number(trend.reduce((sum, p) => sum + p.cost, 0).toFixed(2));

  const byService = services.map((name, i) => {
    const weight = 1 - i * 0.14 + Math.random() * 0.1;
    return {
      name,
      cost: Number(((totalCost / services.length) * weight).toFixed(2))
    };
  });

  const tableRows = Array.from({ length: 8 }, (_, idx) => ({
    project: projects[idx % projects.length],
    service: services[(idx + 1) % services.length],
    cost: Number((45 + Math.random() * 650).toFixed(2)),
    deltaPct: Number(((Math.random() - 0.45) * 18).toFixed(2))
  })).sort((a, b) => b.cost - a.cost);

  return {
    range,
    updatedAt: new Date().toISOString(),
    metrics: {
      totalCost,
      projectedMonthEnd: Number((totalCost * 1.09).toFixed(2)),
      avgHourlyBurn: Number(((totalCost / points) * (range === "24h" ? 1 : 24)).toFixed(2)),
      budgetUsagePct: Number((62 + Math.random() * 18).toFixed(1))
    },
    trend,
    byService,
    tableRows
  };
}
