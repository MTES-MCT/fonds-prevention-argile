import { z } from "zod";
import { parserCsvAvecEntetes } from "@/shared/utils/csv.utils";
import type { NewCatnatDecision } from "@/shared/database/schema/catnat-decisions";
import { DECISIONS_DATA_GOUV } from "../../domain/config/catnat.config";

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

const LigneDecision = z.object({
  date_arrete: z.string().regex(DATE_ISO),
  date_publication: z.string().regex(DATE_ISO),
  code_insee: z.string().regex(/^(\d{5}|2[AB]\d{3})$/),
  commune: z.string().min(1),
  date_debut: z.string().regex(DATE_ISO),
  date_fin: z.string().regex(DATE_ISO),
  decision: z.enum(["reconnue", "refusée"]),
  motif: z.string(),
});

const COLONNES_REQUISES = [...Object.keys(LigneDecision.shape), "phenomene"];

export interface DecisionsLues {
  decisions: NewCatnatDecision[];
  /** Lignes de sécheresse illisibles : leur présence interdit de conclure qu'une décision a disparu de la source. */
  ecartees: number;
}

/**
 * Lit le CSV des décisions et n'en garde que la sécheresse (retrait-gonflement des argiles).
 */
export function lireDecisionsSecheresse(csv: string): DecisionsLues {
  const { colonnes, lignes } = parserCsvAvecEntetes(csv);

  const manquantes = COLONNES_REQUISES.filter((colonne) => !colonnes.includes(colonne));
  if (manquantes.length > 0) {
    throw new Error(`Jeu de données des décisions catnat : colonnes absentes (${manquantes.join(", ")})`);
  }

  const decisions: NewCatnatDecision[] = [];
  let ecartees = 0;

  for (const ligne of lignes) {
    if (!ligne.phenomene.startsWith(DECISIONS_DATA_GOUV.phenomeneSecheresse)) continue;

    const lue = LigneDecision.safeParse(ligne);
    if (!lue.success) {
      ecartees++;
      continue;
    }

    decisions.push({
      codeInsee: lue.data.code_insee,
      libelleCommune: lue.data.commune,
      dateArrete: lue.data.date_arrete,
      datePublicationJo: lue.data.date_publication,
      dateDebutEvt: lue.data.date_debut,
      dateFinEvt: lue.data.date_fin,
      decision: lue.data.decision === "reconnue" ? "reconnue" : "non_reconnue",
      motif: lue.data.decision === "reconnue" ? null : lue.data.motif.trim() || null,
      source: DECISIONS_DATA_GOUV.source,
    });
  }

  return { decisions, ecartees };
}

/**
 * Télécharge le jeu de données data.gouv des décisions de catastrophe naturelle
 */
export async function fetchDecisionsSecheresse(): Promise<DecisionsLues> {
  const response = await fetch(DECISIONS_DATA_GOUV.url, {
    signal: AbortSignal.timeout(DECISIONS_DATA_GOUV.delaiMaxMs),
  });

  if (!response.ok) {
    throw new Error(`Jeu de données des décisions catnat indisponible : HTTP ${response.status}`);
  }

  return lireDecisionsSecheresse(await response.text());
}
