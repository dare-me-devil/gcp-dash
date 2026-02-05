import { NextResponse } from "next/server";

import { readBigQueryConfig, redactConfig, writeBigQueryConfig } from "@/app/lib/config-store";

export async function GET() {
  const config = await readBigQueryConfig();
  if (!config) {
    return NextResponse.json({ isConfigured: false });
  }

  return NextResponse.json(redactConfig(config));
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    projectId?: string;
    dataset?: string;
    table?: string;
    serviceAccountJson?: string;
  };

  if (!body.projectId || !body.dataset || !body.table || !body.serviceAccountJson) {
    return NextResponse.json({ message: "All fields are required." }, { status: 400 });
  }

  try {
    JSON.parse(body.serviceAccountJson);
  } catch {
    return NextResponse.json({ message: "Service account JSON is invalid." }, { status: 400 });
  }

  await writeBigQueryConfig({
    projectId: body.projectId.trim(),
    dataset: body.dataset.trim(),
    table: body.table.trim(),
    serviceAccountJson: body.serviceAccountJson
  });

  return NextResponse.json({ ok: true });
}
