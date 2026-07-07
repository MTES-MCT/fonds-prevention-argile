import { unstable_cache } from "next/cache";
import { getServerEnv } from "@/shared/config/env.config";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { graphqlClient } from "../adapters/graphql/client";
import type { ChampDescriptor } from "../adapters/graphql/types";
import {
  findAideForLabel,
  PIECES_FALLBACK,
  type PieceJustificative,
  type PiecesByStep,
} from "../domain/pieces-justificatives";

/** __typename DN d'un descripteur de pièce justificative. */
const PIECE_TYPENAME = "PieceJustificativeChampDescriptor";

/** Cache DN long : les schémas de démarche bougent rarement. */
const REVALIDATE_SECONDS = 60 * 60 * 6;
const CACHE_TAG = "ds-pieces";

/**
 * Résout le numéro de démarche DN à interroger pour l'étape donnée.
 * Toutes les étapes en amont de l'éligibilité (invitation, choix AMO) visent la
 * démarche d'éligibilité : ce sont les pièces que le ménage doit préparer ensuite.
 */
export function resolveDemarcheNumberForStep(step: Step): number {
  const env = getServerEnv();
  const map: Record<Step, string> = {
    [Step.INVITATION]: env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
    [Step.CHOIX_AMO]: env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
    [Step.ELIGIBILITE]: env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
    [Step.DIAGNOSTIC]: env.DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC,
    [Step.DEVIS]: env.DEMARCHES_SIMPLIFIEES_ID_DEVIS,
    [Step.FACTURES]: env.DEMARCHES_SIMPLIFIEES_ID_FACTURES,
  };
  return parseInt(map[step], 10);
}

/** Aplati les PJ racine et celles nichées dans les blocs répétables. */
function collectPieceDescriptors(champDescriptors: ChampDescriptor[]): ChampDescriptor[] {
  const pieces: ChampDescriptor[] = [];
  for (const champ of champDescriptors) {
    if (champ.__typename === PIECE_TYPENAME) {
      pieces.push(champ);
    } else if (champ.champDescriptors?.length) {
      pieces.push(...collectPieceDescriptors(champ.champDescriptors));
    }
  }
  return pieces;
}

function toPieceJustificative(champ: ChampDescriptor): PieceJustificative {
  const modele =
    champ.fileTemplate?.url && champ.fileTemplate.filename
      ? { filename: champ.fileTemplate.filename, url: champ.fileTemplate.url }
      : undefined;
  return {
    id: champ.id,
    label: champ.label,
    description: champ.description || undefined,
    required: champ.required,
    modele,
    aide: findAideForLabel(champ.label),
  };
}

/**
 * Récupère et mappe les PJ d'une démarche depuis DN. Lève si la démarche est
 * injoignable pour NE PAS mettre en cache un résultat d'erreur (retry au prochain appel).
 */
async function fetchPiecesFromDN(demarcheNumber: number): Promise<PieceJustificative[]> {
  const demarche = await graphqlClient.getDemarcheSchema(demarcheNumber);
  if (!demarche) {
    throw new Error(`Schéma démarche ${demarcheNumber} indisponible`);
  }
  const champDescriptors = demarche.activeRevision?.champDescriptors ?? [];
  return collectPieceDescriptors(champDescriptors).map(toPieceJustificative);
}

const getCachedPieces = (demarcheNumber: number) =>
  unstable_cache(() => fetchPiecesFromDN(demarcheNumber), ["ds-pieces", String(demarcheNumber)], {
    revalidate: REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  })();

/**
 * Pièces justificatives à prévoir pour l'étape donnée, tirées de DN (libellé,
 * description, obligatoire, modèle téléchargeable) et enrichies de l'aide éditoriale.
 * Filet de sécurité : sur erreur ou liste vide, renvoie `PIECES_FALLBACK` — l'UI
 * n'affiche jamais une section vide.
 */
export async function getPiecesJustificativesForStep(step: Step): Promise<PieceJustificative[]> {
  const demarcheNumber = resolveDemarcheNumberForStep(step);
  try {
    const pieces = await getCachedPieces(demarcheNumber);
    return pieces.length > 0 ? pieces : PIECES_FALLBACK;
  } catch (error) {
    // Contexte technique seulement (jamais de payload / donnée personnelle).
    console.error(`Pièces justificatives indisponibles (step=${step}, demarche=${demarcheNumber})`, error);
    return PIECES_FALLBACK;
  }
}

/**
 * Pièces à prévoir pour plusieurs étapes, indexées par étape. Chaque appel est mis
 * en cache : pré-calculer toutes les étapes à venir côté serveur reste peu coûteux.
 */
export async function getPiecesJustificativesByStep(steps: Step[]): Promise<PiecesByStep> {
  const entries = await Promise.all(
    steps.map(async (step) => [step, await getPiecesJustificativesForStep(step)] as const)
  );
  return Object.fromEntries(entries) as PiecesByStep;
}
