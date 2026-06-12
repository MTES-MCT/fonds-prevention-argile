/**
 * Bootstrap d'environnement partagé des scripts ops.
 *
 * L'import de ce module a un EFFET DE BORD : il charge `.env.local` puis `.env` (dotenv).
 * Les helpers qui lisent `process.env` (db, ds-graphql) importent ce module, ce qui
 * garantit que l'environnement est chargé avant toute lecture.
 */
import { config } from "dotenv";
import { Step } from "@/shared/domain/value-objects/step.enum";

config({ path: ".env.local" });
config({ path: ".env" });

/** Chaîne de connexion Postgres : `DATABASE_URL`, sinon reconstruite depuis `DB_*`. */
export function getConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST) throw new Error("DATABASE_URL ou DB_HOST requis");
  return `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

/** Ids des démarches DS par étape, depuis l'environnement. */
export const DEMARCHE_IDS: Partial<Record<Step, string | undefined>> = {
  [Step.ELIGIBILITE]: process.env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
  [Step.DIAGNOSTIC]: process.env.DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC,
  [Step.DEVIS]: process.env.DEMARCHES_SIMPLIFIEES_ID_DEVIS,
  [Step.FACTURES]: process.env.DEMARCHES_SIMPLIFIEES_ID_FACTURES,
};
