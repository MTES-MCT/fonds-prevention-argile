import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/shared/database/schema";
import { getConnectionString } from "./env";

/**
 * Crée une connexion Drizzle pour un script ops (importe `env` → dotenv chargé).
 * Penser à `await client.end()` à la fin du script.
 */
export function createOpsDb() {
  const client = postgres(getConnectionString(), { max: 5, idle_timeout: 10 });
  const db = drizzle(client, { schema });
  return { db, client };
}
