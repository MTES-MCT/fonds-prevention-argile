/**
 * Inspecte, en LECTURE SEULE, ce que DN a extrait des avis d'imposition d'un dossier
 * d'éligibilité (2D-Doc lu par DocumentIA), à côté des déclaratifs du foyer.
 *
 * Valeurs MASQUÉES par défaut (« renseigné » / « vide ») : ce sont des données fiscales.
 *
 * Usage :
 *   pnpm ds:inspecter-avis-impot --dossier=33301642
 *   pnpm ds:inspecter-avis-impot --dossier=33301642,33306423 --afficher-valeurs
 *   pnpm ds:inspecter-avis-impot --fixture=doublon      (réponse DN fictive, sans appel réseau)
 *
 * Fixtures : lu, doublon, deux-foyers, non-lu, sans-avis.
 * Prérequis (mode --dossier) : .env.local avec DEMARCHES_SIMPLIFIEES_GRAPHQL_API_*.
 */

import "../lib/env";
import { getArg, hasFlag } from "../lib/args";
import type { AvisImpotExtrait, DonneesAvisImpotDossier } from "@/features/parcours/dossiers-ds/domain/avis-impot";
import { mapDossierAvisImpot } from "@/features/parcours/dossiers-ds/mappers/avis-impot.mapper";
import {
  FIXTURES_AVIS_IMPOT,
  type NomFixtureAvisImpot,
} from "@/features/parcours/dossiers-ds/mappers/avis-impot.fixtures";

const DOSSIERS_ARG = getArg("dossier");
const FIXTURE_ARG = getArg("fixture");
const AFFICHER_VALEURS = hasFlag("afficher-valeurs");

function valeur(v: string | number | null): string {
  if (v === null) return "vide";
  return AFFICHER_VALEURS ? String(v) : "renseigné";
}

function afficherAvis(avis: AvisImpotExtrait): void {
  const origine = avis.dansRepetition ? " (bloc répété)" : "";
  const etat = avis.nombreFichiers === 0 ? "aucun fichier" : avis.lu ? "2D-Doc lu" : "2D-Doc NON lu";
  console.log(`  - ${avis.libelleChamp}${origine} : ${avis.nombreFichiers} fichier(s), ${etat}`);
  if (avis.nombreFichiers === 0) return;

  const lignes: Array<[string, string | number | null]> = [
    ["Déclarant 1", avis.declarant1],
    ["Déclarant 2", avis.declarant2],
    ["Référence de l'avis", avis.referenceAvis],
    ["Année des revenus", avis.anneeRevenus],
    ["Nombre de parts", avis.nombreParts],
    ["Revenu fiscal de référence", avis.revenuFiscalReference],
    ["Date de mise en recouvrement", avis.dateMiseEnRecouvrement],
  ];
  for (const [libelle, v] of lignes) console.log(`      ${libelle.padEnd(30)} ${valeur(v)}`);
  if (avis.attributsInconnus.length > 0) {
    console.log(`      Colonnes non lues par FPA : ${avis.attributsInconnus.join(", ")}`);
  }
}

function afficher(donnees: DonneesAvisImpotDossier): void {
  const depot = donnees.dateDepot?.slice(0, 10) ?? "non déposé";
  console.log(
    `\nDossier ${donnees.numero} — ${donnees.etat} — démarche ${donnees.demarcheNumero ?? "?"} — dépôt ${depot}`
  );
  console.log("Déclaratif du foyer :");
  console.log(`      ${"Nombre de personnes".padEnd(30)} ${valeur(donnees.declaratif.nombrePersonnes)}`);
  console.log(`      ${"Revenu fiscal de référence".padEnd(30)} ${valeur(donnees.declaratif.revenuFiscalReference)}`);

  if (donnees.avis.length === 0) {
    console.log("Avis d'imposition : aucune pièce de nature AVIS_IMPOT sur ce dossier");
    return;
  }
  console.log(`Avis d'imposition : ${donnees.avis.length} pièce(s) de nature AVIS_IMPOT`);
  donnees.avis.forEach(afficherAvis);

  const references = donnees.avis.map((a) => a.referenceAvis).filter((r): r is string => r !== null);
  const doublons = references.length - new Set(references).size;
  if (doublons > 0) console.log(`  ! ${doublons} avis déposé(s) en double (même référence)`);
}

async function main(): Promise<void> {
  if (FIXTURE_ARG) {
    if (!(FIXTURE_ARG in FIXTURES_AVIS_IMPOT)) {
      console.error(`Fixture inconnue : ${FIXTURE_ARG}. Disponibles : ${Object.keys(FIXTURES_AVIS_IMPOT).join(", ")}`);
      process.exit(1);
    }
    console.log(`(fixture « ${FIXTURE_ARG} », aucune donnée réelle)`);
    afficher(mapDossierAvisImpot(FIXTURES_AVIS_IMPOT[FIXTURE_ARG as NomFixtureAvisImpot]));
    return;
  }

  const numeros = (DOSSIERS_ARG ?? "").split(",").map((n) => Number(n.trim()));
  if (numeros.length === 0 || numeros.some((n) => !Number.isInteger(n) || n <= 0)) {
    console.error("Usage : --dossier=<numéro>[,<numéro>] ou --fixture=<nom>");
    process.exit(1);
  }

  // Import tardif : le client DN exige le token dès sa construction, inutile en mode fixture.
  const { lireAvisImpotDossier } = await import("@/features/parcours/dossiers-ds/services/avis-impot.service");
  for (const numero of numeros) {
    try {
      const donnees = await lireAvisImpotDossier(numero);
      if (donnees) afficher(donnees);
      else console.log(`\nDossier ${numero} : introuvable ou invisible (brouillon non déposé ?)`);
    } catch (error) {
      console.log(`\nDossier ${numero} : lecture DN impossible (${error instanceof Error ? error.message : "erreur"})`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
