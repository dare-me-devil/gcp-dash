import { promises as fs } from "fs";
import path from "path";

export interface StoredBigQueryConfig {
  projectId: string;
  dataset: string;
  table: string;
  serviceAccountJson: string;
}

const dataDir = path.join(process.cwd(), "data");
const configPath = path.join(dataDir, "bigquery-config.json");

function sanitize(value: string): string {
  return value.trim();
}

export async function readBigQueryConfig(): Promise<StoredBigQueryConfig | null> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoredBigQueryConfig>;

    if (!parsed.projectId || !parsed.dataset || !parsed.table || !parsed.serviceAccountJson) {
      return null;
    }

    return {
      projectId: sanitize(parsed.projectId),
      dataset: sanitize(parsed.dataset),
      table: sanitize(parsed.table),
      serviceAccountJson: parsed.serviceAccountJson
    };
  } catch {
    return null;
  }
}

export async function writeBigQueryConfig(config: StoredBigQueryConfig): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function redactConfig(config: StoredBigQueryConfig) {
  return {
    projectId: config.projectId,
    dataset: config.dataset,
    table: config.table,
    isConfigured: true
  };
}

export function validateIdentifier(name: string): boolean {
  return /^[a-zA-Z0-9_\-]+$/.test(name);
}
