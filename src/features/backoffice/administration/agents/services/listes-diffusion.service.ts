import type { PgTransaction } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { allersVers, entreprisesAmo } from "@/shared/database/schema";

/** Exécuteur : le client global, ou une transaction en cours. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = typeof db | PgTransaction<any, any, any>;

export interface ListeDiffusion {
  type: "amo" | "allers_vers";
  id: string;
  nom: string;
  /** Retirer l'adresse laisserait la structure sans destinataire : on ne le fait pas. */
  estDerniereAdresse: boolean;
}

export interface RetraitListesResult {
  retirees: ListeDiffusion[];
  conservees: ListeDiffusion[];
}

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Découpe la liste AMO sans rien filtrer : on préserve les entrées telles quelles,
 * contrairement à `validateEmailsList` qui écarte les adresses malformées.
 */
function decouperEmailsAmo(emails: string): string[] {
  return emails
    .split(";")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/**
 * Structures dont la liste de diffusion contient cette adresse.
 * Ces listes sont éditoriales (elles contiennent aussi des boîtes génériques) et
 * vivent hors de la table `agents` : rien ne les synchronise automatiquement.
 */
export async function findListesDiffusionAvecEmail(email: string): Promise<ListeDiffusion[]> {
  const cible = normalise(email);
  if (!cible) return [];

  const [amos, structuresAv] = await Promise.all([
    db.select({ id: entreprisesAmo.id, nom: entreprisesAmo.nom, emails: entreprisesAmo.emails }).from(entreprisesAmo),
    db.select({ id: allersVers.id, nom: allersVers.nom, emails: allersVers.emails }).from(allersVers),
  ]);

  const listes: ListeDiffusion[] = [];

  for (const amo of amos) {
    const adresses = decouperEmailsAmo(amo.emails);
    if (!adresses.some((e) => normalise(e) === cible)) continue;
    const restantes = adresses.filter((e) => normalise(e) !== cible);
    listes.push({ type: "amo", id: amo.id, nom: amo.nom, estDerniereAdresse: restantes.length === 0 });
  }

  for (const av of structuresAv) {
    const adresses = av.emails.filter((e) => e.trim().length > 0);
    if (!adresses.some((e) => normalise(e) === cible)) continue;
    const restantes = adresses.filter((e) => normalise(e) !== cible);
    listes.push({ type: "allers_vers", id: av.id, nom: av.nom, estDerniereAdresse: restantes.length === 0 });
  }

  return listes;
}

/**
 * Retire l'adresse des listes de diffusion, sauf quand elle y est la dernière :
 * vider la liste couperait silencieusement les mails de la structure.
 *
 * `estDerniereAdresse` n'est qu'une indication d'affichage : le verdict est repris
 * sur la valeur relue juste avant l'UPDATE, la liste ayant pu changer entre-temps.
 */
export async function retirerEmailDesListes(
  email: string,
  listes: ListeDiffusion[],
  executor: Executor = db
): Promise<RetraitListesResult> {
  const cible = normalise(email);
  const retirees: ListeDiffusion[] = [];
  const conservees: ListeDiffusion[] = [];

  for (const liste of listes) {
    if (liste.estDerniereAdresse) {
      conservees.push(liste);
      continue;
    }

    if (liste.type === "amo") {
      const [amo] = await executor
        .select({ emails: entreprisesAmo.emails })
        .from(entreprisesAmo)
        .where(eq(entreprisesAmo.id, liste.id));
      if (!amo) continue;

      const restantes = decouperEmailsAmo(amo.emails).filter((e) => normalise(e) !== cible);
      if (restantes.length === 0) {
        conservees.push({ ...liste, estDerniereAdresse: true });
        continue;
      }

      await executor
        .update(entreprisesAmo)
        .set({ emails: restantes.join(";") })
        .where(eq(entreprisesAmo.id, liste.id));
    } else {
      const [av] = await executor
        .select({ emails: allersVers.emails })
        .from(allersVers)
        .where(eq(allersVers.id, liste.id));
      if (!av) continue;

      const restantes = av.emails.filter((e) => normalise(e) !== cible);
      if (restantes.length === 0) {
        conservees.push({ ...liste, estDerniereAdresse: true });
        continue;
      }

      await executor.update(allersVers).set({ emails: restantes }).where(eq(allersVers.id, liste.id));
    }

    retirees.push(liste);
  }

  return { retirees, conservees };
}
