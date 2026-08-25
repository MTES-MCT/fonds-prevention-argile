import { and, desc, eq } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "../client";
import { dossiersDsTentatives, type DossierDsTentative, type OrigineTentative } from "../schema";
import type { Step } from "@/shared/domain/value-objects/step.enum";

/** Exécuteur : le client global, ou une transaction en cours. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = typeof db | PgTransaction<any, any, any>;

interface RecordTentativeParams {
  parcoursId: string;
  step: Step;
  dsNumber: string;
  origine: OrigineTentative;
  dsId?: string | null;
  dsDemarcheId?: string | null;
  dsUrl?: string | null;
}

/**
 * Registre append-only des numéros DN connus d'un parcours (ADR-0027).
 * Aucune méthode de suppression : un numéro entré ici n'en sort jamais.
 */
export const dossiersDsTentativesRepository = {
  /**
   * Enregistre une tentative. Idempotent sur `ds_number` : un numéro déjà connu n'est ni
   * dupliqué ni réécrit — sa provenance d'origine et sa date de découverte font foi.
   * Accepte une transaction pour être écrite avec le pointeur dans le même commit.
   */
  async record(params: RecordTentativeParams, executor: Executor = db): Promise<void> {
    await executor
      .insert(dossiersDsTentatives)
      .values({
        parcoursId: params.parcoursId,
        step: params.step,
        dsNumber: params.dsNumber,
        origine: params.origine,
        dsId: params.dsId ?? null,
        dsDemarcheId: params.dsDemarcheId ?? null,
        dsUrl: params.dsUrl ?? null,
      })
      .onConflictDoNothing({ target: dossiersDsTentatives.dsNumber });
  },

  /** Toutes les tentatives connues d'une étape, la plus récente d'abord. */
  async findByParcoursStep(parcoursId: string, step: Step): Promise<DossierDsTentative[]> {
    return db
      .select()
      .from(dossiersDsTentatives)
      .where(and(eq(dossiersDsTentatives.parcoursId, parcoursId), eq(dossiersDsTentatives.step, step)))
      .orderBy(desc(dossiersDsTentatives.createdAt));
  },

  /** Le parcours auquel un numéro DN est rattaché, s'il est déjà connu. */
  async findByDsNumber(dsNumber: string): Promise<DossierDsTentative | null> {
    const [row] = await db
      .select()
      .from(dossiersDsTentatives)
      .where(eq(dossiersDsTentatives.dsNumber, dsNumber))
      .limit(1);
    return row ?? null;
  },

  /**
   * Efface l'URL de préremplissage (qui porte le `prefill_token`) sans toucher au numéro :
   * une fois le dossier déposé, le lien n'a plus d'usage et ne doit plus être conservé.
   */
  async purgerUrl(dsNumber: string): Promise<void> {
    await db.update(dossiersDsTentatives).set({ dsUrl: null }).where(eq(dossiersDsTentatives.dsNumber, dsNumber));
  },
};
