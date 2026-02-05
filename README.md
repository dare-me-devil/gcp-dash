# GCP Billing Dashboard

A real-time Google Cloud billing dashboard built with Next.js, TypeScript, Highcharts, and shadcn/ui-style components.

## Easiest BigQuery integration approach

The easiest production-friendly way (without a separate backend) is:

1. Enable Cloud Billing export to BigQuery in Google Cloud.
2. Create a service account with BigQuery read access to the billing export table.
3. In this app, open **BigQuery Setup**, paste:
   - Project ID
   - Dataset
   - Table
   - Service account JSON
4. Click **Save and Connect**.

The configuration is saved locally on disk in `data/bigquery-config.json`, so refresh/restart does not erase it.

## Features

- Interactive line and pie charts for spend trend + service breakdown
- Metrics cards for key billing KPIs
- Detailed cost driver table
- Time range selector (24h / 7d / 30d)
- BigQuery connection form with local persistence
- Simulated fallback when BigQuery is not configured
- Auto refresh every 30 seconds
- Responsive, minimal UI

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
