/**
 * Inspecte, en LECTURE SEULE, ce que DN a extrait des avis d'imposition d'un dossier
 * d'éligibilité (2D-Doc lu par DocumentIA), à côté des déclaratifs du foyer.
 *
 * Affiche aussi le verdict du contrôle de cohérence ; son détail (montants) seulement avec
 * --afficher-valeurs. Valeurs MASQUÉES par défaut : ce sont des données fiscales.
 *
 * Usage :
 *   pnpm ds:inspecter-avis-impot --dossier=33301642
 *   pnpm ds:inspecter-avis-impot --dossier=33301642,33306423 --afficher-valeurs
 *   pnpm ds:inspecter-avis-impot --fixture=ecart-revenu --afficher-valeurs
 *   (fixture = réponse DN fictive, sans appel réseau)
 *
 * Fixtures : lu, doublon, deux-foyers, ecart-revenu, non-lu, sans-avis.
 * Prérequis (mode --dossier) : .env.local avec DEMARCHES_SIMPLIFIEES_GRAPHQL_API_*.
 */

import "../lib/env";
import { getArg, hasFlag } from "../lib/args";
import {
  LIBELLES_STATUT_CONTROLE,
  controlerAvisImpot,
  formaterDetailControle,
  texteAnnotationControle,
  type AvisImpotExtrait,
  type DonneesAvisImpotDossier,
} from "@/features/parcours/dossiers-ds/domain/avis-impot";
import { calculerTrancheDossier, valeurTauxSubvention } from "@/features/parcours/dossiers-ds/domain/tranche-revenu";
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
  } else {
    console.log(`Avis d'imposition : ${donnees.avis.length} pièce(s) de nature AVIS_IMPOT`);
    donnees.avis.forEach(afficherAvis);
  }

  afficherControle(donnees);
}

function afficherControle(donnees: DonneesAvisImpotDossier): void {
  const resultat = controlerAvisImpot(donnees, { maintenant: new Date() });
  const tranche = calculerTrancheDossier({
    revenuFiscalReference: donnees.declaratif.revenuFiscalReference,
    nombrePersonnes: donnees.declaratif.nombrePersonnes,
    codeDepartement: donnees.codeDepartement,
  });
  console.log(`Annotation DN : « ${texteAnnotationControle(resultat)} »`);
  console.log(
    `Tranche de revenus : ${tranche.typeMenage} — taux de subvention : ${valeurTauxSubvention(tranche) ?? "vide"}`
  );
  console.log(`Contrôle : ${LIBELLES_STATUT_CONTROLE[resultat.statut]}`);
  if (AFFICHER_VALEURS) {
    console.log(formaterDetailControle(resultat).replace(/^/gm, "      "));
    return;
  }
  const criteres = [
    ["Revenu fiscal de référence", resultat.revenu.statut],
    ["Personnes du ménage", resultat.foyer.statut],
    ["Année des revenus", resultat.annee.statut],
  ] as const;
  for (const [libelle, statut] of criteres) {
    console.log(`      ${libelle.padEnd(30)} ${LIBELLES_STATUT_CONTROLE[statut]}`);
  }
  console.log(
    `      ${resultat.avisLus} avis lu(s), ${resultat.avisNonLus} non lu(s), ${resultat.doublonsIgnores} doublon(s)`
  );
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
