export type TimeRange = "24h" | "7d" | "30d";

export interface TrendPoint {
  timestamp: number;
  cost: number;
}

export interface ServiceCost {
  name: string;
  cost: number;
}

export interface BillingMetrics {
  totalCost: number;
  projectedMonthEnd: number;
  avgHourlyBurn: number;
  budgetUsagePct: number;
}

export interface BillingSnapshot {
  range: TimeRange;
  updatedAt: string;
  metrics: BillingMetrics;
  trend: TrendPoint[];
  byService: ServiceCost[];
  tableRows: {
    project: string;
    service: string;
    cost: number;
    deltaPct: number;
  }[];
}
