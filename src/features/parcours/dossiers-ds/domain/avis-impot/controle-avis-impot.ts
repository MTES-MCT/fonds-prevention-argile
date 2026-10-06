import { calculerTrancheRevenu, type TrancheRevenuRga } from "@/features/simulateur/domain/types/rga-revenus.types";
import { estDepartementIDF } from "../tranche-revenu";
import type { AvisImpotExtrait, DonneesAvisImpotDossier } from "./avis-impot.types";

export const STATUTS_CONTROLE = {
  COHERENT: "coherent",
  A_VERIFIER: "a_verifier",
  NON_VERIFIABLE: "non_verifiable",
} as const;

export type StatutControle = (typeof STATUTS_CONTROLE)[keyof typeof STATUTS_CONTROLE];

export interface ControleRevenu {
  statut: StatutControle;
  declare: number | null;
  /** Somme des RFR des avis distincts, null si un avis manque. */
  avis: number | null;
  ecart: number | null;
  trancheDeclaree: TrancheRevenuRga | null;
  trancheAvis: TrancheRevenuRga | null;
}

export interface ControleFoyer {
  statut: StatutControle;
  declare: number | null;
  nombreParts: number | null;
  declarants: number;
  estimationMin: number | null;
  estimationMax: number | null;
}

export interface ControleAnnee {
  statut: StatutControle;
  attendue: number;
  lues: number[];
}

export type SourceAvis = "bloc_repete" | "dernier_avis";

export interface ResultatControleAvisImpot {
  statut: StatutControle;
  /** Champ dont les avis ont été retenus ; l'autre est ignoré. */
  source: SourceAvis;
  avisDeposes: number;
  avisLus: number;
  avisNonLus: number;
  doublonsIgnores: number;
  revenu: ControleRevenu;
  foyer: ControleFoyer;
  annee: ControleAnnee;
}

export interface ContexteControle {
  maintenant: Date;
}

const { COHERENT, A_VERIFIER, NON_VERIFIABLE } = STATUTS_CONTROLE;

// Un avis par ligne du bloc répété ; « Dernier avis », qui peut en mêler plusieurs, ne sert qu'aux dossiers d'avant le bloc.
function avisRetenus(avis: AvisImpotExtrait[]): { source: SourceAvis; deposes: AvisImpotExtrait[] } {
  const repetes = avis.filter((a) => a.dansRepetition && a.nombreFichiers > 0);
  if (repetes.length > 0) return { source: "bloc_repete", deposes: repetes };
  return { source: "dernier_avis", deposes: avis.filter((a) => !a.dansRepetition && a.nombreFichiers > 0) };
}

// Même avis déposé sur deux lignes du bloc : une seule fois dans la somme.
function cleAvis(avis: AvisImpotExtrait): string {
  return avis.referenceAvis ?? `${avis.declarant1}|${avis.anneeRevenus}|${avis.revenuFiscalReference}`;
}

function dedoublonner(avis: AvisImpotExtrait[]): AvisImpotExtrait[] {
  const parCle = new Map<string, AvisImpotExtrait>();
  for (const a of avis) if (!parCle.has(cleAvis(a))) parCle.set(cleAvis(a), a);
  return [...parCle.values()];
}

function auQuart(valeur: number): number {
  return Math.round(valeur * 4) / 4;
}

// Quotient familial : 0,5 part pour chacun des deux premiers enfants, 1 part à partir du troisième.
function personnesACharge(partsRestantes: number): number {
  if (partsRestantes <= 0) return 0;
  if (partsRestantes <= 1) return Math.ceil(partsRestantes / 0.5);
  return 2 + Math.ceil(partsRestantes - 1);
}

/** Fourchette indicative : un déclarant seul peut avoir une demi-part de parent isolé. */
function estimerPersonnes(avis: AvisImpotExtrait, nombreParts: number): { min: number; max: number } {
  const declarants = avis.declarant2 ? 2 : 1;
  const reste = auQuart(Math.max(0, nombreParts - declarants));
  const demiPartIsolement = avis.declarant2 ? 0 : 0.5;
  return {
    min: declarants + personnesACharge(auQuart(Math.max(0, reste - demiPartIsolement))),
    max: declarants + personnesACharge(reste),
  };
}

// Barème lu sur le département du dossier DN, comme l'annotation « Tranche de revenus ».
function tranche(revenu: number, personnes: number | null, codeDepartement: string | null): TrancheRevenuRga | null {
  if (!codeDepartement || !personnes || personnes < 1) return null;
  return calculerTrancheRevenu(revenu, personnes, estDepartementIDF(codeDepartement));
}

function controlerRevenu(
  declaratif: DonneesAvisImpotDossier["declaratif"],
  avis: AvisImpotExtrait[],
  complet: boolean,
  codeDepartement: string | null
): ControleRevenu {
  const declare = declaratif.revenuFiscalReference;
  const montants = avis.map((a) => a.revenuFiscalReference);
  const somme =
    complet && avis.length > 0 && montants.every((m) => m !== null)
      ? montants.reduce<number>((total, m) => total + (m ?? 0), 0)
      : null;

  if (declare === null || somme === null) {
    return { statut: NON_VERIFIABLE, declare, avis: somme, ecart: null, trancheDeclaree: null, trancheAvis: null };
  }
  const ecart = somme - declare;
  return {
    statut: ecart === 0 ? COHERENT : A_VERIFIER,
    declare,
    avis: somme,
    ecart,
    trancheDeclaree: ecart === 0 ? null : tranche(declare, declaratif.nombrePersonnes, codeDepartement),
    trancheAvis: ecart === 0 ? null : tranche(somme, declaratif.nombrePersonnes, codeDepartement),
  };
}

function controlerFoyer(declare: number | null, avis: AvisImpotExtrait[], complet: boolean): ControleFoyer {
  const declarants = avis.reduce((total, a) => total + (a.declarant2 ? 2 : 1), 0);
  const parts = avis.map((a) => a.nombreParts);
  if (!complet || avis.length === 0 || parts.some((p) => p === null)) {
    return { statut: NON_VERIFIABLE, declare, nombreParts: null, declarants, estimationMin: null, estimationMax: null };
  }

  const estimations = avis.map((a) => estimerPersonnes(a, a.nombreParts ?? 0));
  const estimationMin = estimations.reduce((total, e) => total + e.min, 0);
  const estimationMax = estimations.reduce((total, e) => total + e.max, 0);
  const nombreParts = auQuart(parts.reduce<number>((total, p) => total + (p ?? 0), 0));
  const compatible = declare !== null && declare >= estimationMin && declare <= estimationMax;

  return {
    statut: declare === null ? NON_VERIFIABLE : compatible ? COHERENT : A_VERIFIER,
    declare,
    nombreParts,
    declarants,
    estimationMin,
    estimationMax,
  };
}

// Revenus N-1, N étant l'année du dépôt (date DN, lue telle quelle pour éviter le fuseau).
function controlerAnnee(avis: AvisImpotExtrait[], dateDepot: string | null, maintenant: Date): ControleAnnee {
  const anneeDepot = dateDepot ? Number(dateDepot.slice(0, 4)) : maintenant.getFullYear();
  const attendue = anneeDepot - 1;
  const lues = [...new Set(avis.map((a) => a.anneeRevenus).filter((a): a is number => a !== null))].sort();
  if (lues.length === 0) return { statut: NON_VERIFIABLE, attendue, lues };
  return { statut: lues.every((a) => a === attendue) ? COHERENT : A_VERIFIER, attendue, lues };
}

export function controlerAvisImpot(
  donnees: Pick<DonneesAvisImpotDossier, "declaratif" | "avis" | "dateDepot" | "codeDepartement">,
  contexte: ContexteControle
): ResultatControleAvisImpot {
  const { source, deposes } = avisRetenus(donnees.avis);
  const lus = deposes.filter((a) => a.lu);
  const distincts = dedoublonner(lus);
  const avisNonLus = deposes.length - lus.length;
  const complet = avisNonLus === 0;

  const revenu = controlerRevenu(donnees.declaratif, distincts, complet, donnees.codeDepartement);
  const foyer = controlerFoyer(donnees.declaratif.nombrePersonnes, distincts, complet);
  const annee = controlerAnnee(distincts, donnees.dateDepot, contexte.maintenant);

  const statut =
    distincts.length === 0
      ? NON_VERIFIABLE
      : complet && [revenu, foyer, annee].every((c) => c.statut === COHERENT)
        ? COHERENT
        : A_VERIFIER;

  return {
    statut,
    source,
    avisDeposes: deposes.length,
    avisLus: distincts.length,
    avisNonLus,
    doublonsIgnores: lus.length - distincts.length,
    revenu,
    foyer,
    annee,
  };
}
