import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "dotenv";

// Charge le .env uniquement en local
if (!process.env.SCALINGO_POSTGRESQL_URL && !process.env.NEXT_RUNTIME) {
  config();
}

const MAX_CONNECTIONS = 10;
const IDLE_TIMEOUT = 30;
const CONNECTION_TIMEOUT = 10;

// Construction de l'URL de connexion - même logique que drizzle.config.ts
function getConnectionString(): string {
  // Priorité 1 : Scalingo (production)
  if (process.env.SCALINGO_POSTGRESQL_URL) {
    return process.env.SCALINGO_POSTGRESQL_URL;
  }

  // Priorité 2 : DATABASE_URL si définie
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Priorité 3 : Construction depuis les variables individuelles
  // Validation des variables requises
  const requiredEnvVars = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
  ];

  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Configuration de base de données incomplète. Variables manquantes: ${missing.join(", ")}`
    );
  }

  // Construction de l'URL depuis les variables d'environnement
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

// Obtenir la chaîne de connexion
const connectionString = getConnectionString();

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
