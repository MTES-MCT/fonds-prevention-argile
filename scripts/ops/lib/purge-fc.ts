/**
 * Suppression des comptes demandeurs de test FranceConnect (IdP « low » mocké).
 * Partagé par `scripts/ops/fix/purge-comptes-test-fc.ts` (CLI, avec rapport détaillé)
 * et par `scripts/seed/seed-staging.ts` (option `--purge-fc`).
 *
 * L'appelant reste responsable de la garde anti-production et de la fermeture du client.
 */

import { inArray } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { users } from "@/shared/database/schema";
import { parseTestEmails } from "./fc-test-emails";

export const CSV_URL_FC_TEST =
  "https://raw.githubusercontent.com/france-connect/sources/main/docker/volumes/fcp-low/mocks/idp/databases/citizen/base.csv";

/**
 * Liste des emails de test, lue en direct sur le CSV de l'IdP.
 * Jette plutôt que de retourner une liste vide : sans elle on ne sait pas
 * distinguer un compte de test d'un vrai demandeur, et ne rien supprimer
 * passerait pour un succès.
 */
export async function recupererEmailsTestFc(url: string = CSV_URL_FC_TEST): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Téléchargement du CSV FranceConnect échoué (HTTP ${res.status}) — ${url}`);
  }
  return parseTestEmails(await res.text());
}

/** Comptes de test présents en base, pour un décompte avant suppression. */
export async function listerComptesTestFc(emails: string[]) {
  if (emails.length === 0) return [];
  return db
    .select({ id: users.id, email: users.email, nom: users.nom, prenom: users.prenom })
    .from(users)
    .where(inArray(users.email, emails));
}

/**
 * Supprime les comptes correspondants. Le reste (parcours, dossiers, validations,
 * qualifications, actions, tokens) part en cascade côté base.
 */
export async function supprimerComptesTestFc(emails: string[]): Promise<number> {
  if (emails.length === 0) return 0;
  return db.transaction(async (tx) => {
    const rows = await tx.delete(users).where(inArray(users.email, emails)).returning({ id: users.id });
    return rows.length;
  });
}
