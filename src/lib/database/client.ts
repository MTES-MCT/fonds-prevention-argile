import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const MAX_CONNECTIONS = 10; // Nombre maximum de connexions
const IDLE_TIMEOUT = 30; // Timeout en secondes
const CONNECTION_TIMEOUT = 10; // Timeout de connexion en secondes

// Configuration de la connexion
const connectionString =
  process.env.SCALINGO_POSTGRESQL_URL ||
  `postgres://${process.env.DB_USER || "fonds_argile_user"}:${
    process.env.DB_PASSWORD || "fonds_argile_password"
  }@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${
    process.env.DB_NAME || "fonds_argile"
  }`;

// Client postgres
const client = postgres(connectionString, {
  max: MAX_CONNECTIONS,
  idle_timeout: IDLE_TIMEOUT,
  connect_timeout: CONNECTION_TIMEOUT,
});

// Instance Drizzle
export const db = drizzle(client, { schema });

// Export du client raw si besoin
export const rawClient = client;

// Type helper pour les transactions
export type Database = typeof db;
