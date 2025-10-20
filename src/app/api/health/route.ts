import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/shared/database";

export async function GET() {
  const timestamp = new Date().toISOString();

  const health = {
    status: "OK" as "OK" | "DEGRADED" | "ERROR",
    timestamp,
    service: "Fonds prévention argile API",
    version: "1.0.0", // TODO récupérer dynamiquement
    environment: process.env.NEXT_PUBLIC_APP_ENV || "unknown",
    checks: {
      api: "OK" as "OK" | "ERROR",
      database: "OK" as "OK" | "ERROR" | "DISCONNECTED",
    },
  };

  // Test de la connexion base de données
  try {
    await db.execute(sql`SELECT 1 as test`);
    health.checks.database = "OK";
  } catch (error) {
    console.error("Database health check failed:", error);
    health.checks.database = "ERROR";
    health.status = "DEGRADED";
  }

  const statusCode = health.status === "OK" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
