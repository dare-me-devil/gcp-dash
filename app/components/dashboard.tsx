"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { AlertCircle, Cloud, RefreshCw } from "lucide-react";

import { fetchBillingSnapshot } from "@/app/lib-simulated-bigquery";
import { BillingSnapshot, TimeRange } from "@/app/types/billing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rangeLabels: Record<TimeRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days"
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function BillingDashboard() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (selectedRange: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBillingSnapshot(selectedRange);
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(range);
  }, [range, loadData]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadData(range);
    }, 30_000);

    return () => clearInterval(id);
  }, [range, loadData]);

  const lineOptions = useMemo<Highcharts.Options>(() => {
    if (!snapshot) {
      return { series: [] };
    }

    return {
      chart: { type: "spline", backgroundColor: "transparent", height: 300 },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        type: "datetime",
        labels: { style: { color: "#64748b" } }
      },
      yAxis: {
        title: { text: "Cost (USD)" },
        labels: { formatter() { return `$${this.value}`; } }
      },
      tooltip: { valuePrefix: "$", valueDecimals: 2 },
      series: [
        {
          type: "spline",
          name: "Billing Trend",
          data: snapshot.trend.map((point) => [point.timestamp, point.cost]),
          color: "#2563eb"
        }
      ]
    };
  }, [snapshot]);

  const pieOptions = useMemo<Highcharts.Options>(() => {
    if (!snapshot) {
      return { series: [] };
    }

    return {
      chart: { type: "pie", backgroundColor: "transparent", height: 300 },
      title: { text: undefined },
      credits: { enabled: false },
      tooltip: { pointFormat: "<b>${point.y:.2f}</b> ({point.percentage:.1f}%)" },
      series: [
        {
          type: "pie",
          name: "Service Share",
          data: snapshot.byService.map((item) => ({ name: item.name, y: item.cost }))
        }
      ]
    };
  }, [snapshot]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Google Cloud Billing Dashboard</h1>
          <p className="text-sm text-slate-600">Real-time cost visibility with simulated BigQuery queries.</p>
        </div>
        <div className="flex items-center gap-3">
          <Cloud className="h-5 w-5 text-blue-600" />
          <Select
            value={range}
            onChange={(event) => setRange(event.target.value as TimeRange)}
            className="w-[180px]"
            options={[
              { value: "24h", label: "Last 24 hours" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" }
            ]}
          />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Cost" value={snapshot ? currency.format(snapshot.metrics.totalCost) : "--"} />
        <MetricCard label="Projected Month End" value={snapshot ? currency.format(snapshot.metrics.projectedMonthEnd) : "--"} />
        <MetricCard label="Average Burn Rate" value={snapshot ? `${currency.format(snapshot.metrics.avgHourlyBurn)}/hr` : "--"} />
        <MetricCard label="Budget Usage" value={snapshot ? `${snapshot.metrics.budgetUsagePct}%` : "--"} />
      </section>

      {error ? (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-2 pt-6 text-red-700">
            <AlertCircle className="h-4 w-4" /> {error}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center gap-2 text-slate-600">
            <RefreshCw className="h-4 w-4 animate-spin" /> Refreshing billing data...
          </CardContent>
        </Card>
      ) : null}

      {!loading && snapshot ? (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Cost Trend</CardTitle>
                <CardDescription>{rangeLabels[snapshot.range]}</CardDescription>
              </CardHeader>
              <CardContent>
                <HighchartsReact highcharts={Highcharts} options={lineOptions} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Spend by Service</CardTitle>
                <CardDescription>Distribution of current spend</CardDescription>
              </CardHeader>
              <CardContent>
                <HighchartsReact highcharts={Highcharts} options={pieOptions} />
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Top Cost Drivers
                <Badge variant="secondary">Updated {new Date(snapshot.updatedAt).toLocaleTimeString()}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.tableRows.map((row, idx) => (
                    <TableRow key={`${row.project}-${idx}`}>
                      <TableCell className="font-medium">{row.project}</TableCell>
                      <TableCell>{row.service}</TableCell>
                      <TableCell className="text-right">{currency.format(row.cost)}</TableCell>
                      <TableCell className={`text-right ${row.deltaPct > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {row.deltaPct > 0 ? "+" : ""}
                        {row.deltaPct}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
