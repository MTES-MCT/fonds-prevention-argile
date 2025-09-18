import { defineConfig } from "drizzle-kit";

// Validation des variables d'environnement
if (!process.env.SCALINGO_POSTGRESQL_URL) {
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
      `Variables d'environnement manquantes: ${missing.join(", ")}\n` +
        `Assurez-vous d'avoir un fichier .env avec ces variables.`
    );
  }
}

export default defineConfig({
  schema: "./src/lib/database/schema/index.ts",
  out: "./src/lib/database/migrations",
  dialect: "postgresql",
  dbCredentials: process.env.SCALINGO_POSTGRESQL_URL
    ? // En production/staging Scalingo
      {
        url: process.env.SCALINGO_POSTGRESQL_URL,
      }
    : // En local - variables vérifiées au-dessus
      {
        host: process.env.DB_HOST as string,
        port: parseInt(process.env.DB_PORT as string),
        user: process.env.DB_USER as string,
        password: process.env.DB_PASSWORD as string,
        database: process.env.DB_NAME as string,
      },
  verbose: true,
  strict: true,
});
