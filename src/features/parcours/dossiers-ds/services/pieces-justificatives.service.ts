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

/** Route proxy qui régénère l'URL temporaire du modèle DN au moment du clic. */
export const MODELE_PROXY_PATH = "/api/ds/piece-modele";

/**
 * URL interne (proxy) du modèle d'une pièce. On ne sert jamais l'URL `fileTemplate`
 * de DN directement : c'est un lien temporaire signé (Swift TempURL) qui expire vite,
 * alors que la liste des pièces est mise en cache 6 h → on servirait un lien périmé
 * (« Unauthorized temp url invalide »). Le proxy régénère l'URL fraîche à chaque clic.
 */
export function buildModeleProxyUrl(demarcheNumber: number, champId: string): string {
  const params = new URLSearchParams({ demarche: String(demarcheNumber), champ: champId });
  return `${MODELE_PROXY_PATH}?${params.toString()}`;
}

/** Numéros de démarche configurés — whitelist pour la route proxy (anti open-proxy). */
export function getConfiguredDemarcheNumbers(): Set<number> {
  const env = getServerEnv();
  return new Set(
    [
      env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
      env.DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC,
      env.DEMARCHES_SIMPLIFIEES_ID_DEVIS,
      env.DEMARCHES_SIMPLIFIEES_ID_FACTURES,
    ].map((id) => parseInt(id, 10))
  );
}

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

function toPieceJustificative(champ: ChampDescriptor, demarcheNumber: number): PieceJustificative {
  // L'URL exposée est le proxy interne (stable, cachable) — jamais l'URL temporaire DN.
  const modele =
    champ.fileTemplate?.url && champ.fileTemplate.filename
      ? { filename: champ.fileTemplate.filename, url: buildModeleProxyUrl(demarcheNumber, champ.id) }
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
  return collectPieceDescriptors(champDescriptors).map((champ) => toPieceJustificative(champ, demarcheNumber));
}

/**
 * URL fraîche du modèle (fileTemplate) d'une pièce donnée, lue en direct depuis DN.
 * Volontairement NON cachée : le lien temporaire DN expire vite, on le régénère à
 * chaque appel. Renvoie null si la démarche/le champ est introuvable ou sans modèle.
 */
export async function getFreshModeleUrl(demarcheNumber: number, champId: string): Promise<string | null> {
  const demarche = await graphqlClient.getDemarcheSchema(demarcheNumber);
  if (!demarche) return null;
  const champDescriptors = demarche.activeRevision?.champDescriptors ?? [];
  const piece = collectPieceDescriptors(champDescriptors).find((champ) => champ.id === champId);
  return piece?.fileTemplate?.url ?? null;
}

// `v2` : invalide les entrées cachées avant le passage aux URLs proxy (elles
// contenaient l'URL temporaire DN directe → 403 « Unauthorized temp url invalide »).
const getCachedPieces = (demarcheNumber: number) =>
  unstable_cache(() => fetchPiecesFromDN(demarcheNumber), ["ds-pieces", "v2", String(demarcheNumber)], {
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
