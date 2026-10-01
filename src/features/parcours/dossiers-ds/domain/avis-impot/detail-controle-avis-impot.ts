import { STATUTS_CONTROLE, type ResultatControleAvisImpot, type StatutControle } from "./controle-avis-impot";

export const LIBELLES_STATUT_CONTROLE: Record<StatutControle, string> = {
  [STATUTS_CONTROLE.COHERENT]: "Cohérent",
  [STATUTS_CONTROLE.A_VERIFIER]: "À vérifier",
  [STATUTS_CONTROLE.NON_VERIFIABLE]: "Non vérifiable",
};

// Espace simple plutôt que l'espace fine de toLocaleString, lisible dans n'importe quel terminal.
function euros(montant: number): string {
  return `${String(Math.abs(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
}

function decimal(valeur: number): string {
  return String(valeur).replace(".", ",");
}

function accord(nombre: number, singulier: string, plurielForme = `${singulier}s`): string {
  return nombre > 1 ? plurielForme : singulier;
}

function ligneAvis(r: ResultatControleAvisImpot): string {
  const doublons = r.doublonsIgnores > 0 ? `, ${r.doublonsIgnores} ${accord(r.doublonsIgnores, "doublon")} ignoré` : "";
  const nonLus = r.avisNonLus > 0 ? `, ${r.avisNonLus} non ${accord(r.avisNonLus, "lu")}` : "";
  return `Avis lus : ${r.avisLus} sur ${r.avisDeposes} ${accord(r.avisDeposes, "pièce")}${nonLus}${doublons}`;
}

function ligneRevenu({ revenu }: ResultatControleAvisImpot): string {
  const titre = "Revenu fiscal de référence";
  if (revenu.declare === null) return `${titre} : non vérifiable (non renseigné par le demandeur)`;
  if (revenu.avis === null) return `${titre} : non vérifiable (avis incomplets)`;
  const valeurs = `déclaré ${euros(revenu.declare)}, avis ${euros(revenu.avis)}`;
  if (revenu.ecart === 0) return `${titre} : cohérent (${valeurs})`;

  const signe = (revenu.ecart ?? 0) > 0 ? "+" : "-";
  let impact = "tranche non calculée (commune inconnue)";
  if (revenu.trancheDeclaree && revenu.trancheAvis) {
    if (revenu.trancheAvis === "supérieure") impact = "devient inéligible (tranche supérieure)";
    else if (revenu.trancheDeclaree === revenu.trancheAvis) impact = `tranche inchangée (${revenu.trancheAvis})`;
    else impact = `tranche ${revenu.trancheDeclaree} → ${revenu.trancheAvis}`;
  }
  return `${titre} : écart de ${signe}${euros(revenu.ecart ?? 0)} (${valeurs}), ${impact}`;
}

function ligneFoyer({ foyer }: ResultatControleAvisImpot): string {
  const titre = "Personnes du ménage";
  if (foyer.nombreParts === null || foyer.estimationMin === null) return `${titre} : non vérifiable (parts non lues)`;
  if (foyer.declare === null) return `${titre} : non vérifiable (non renseigné par le demandeur)`;
  const estimation =
    foyer.estimationMin === foyer.estimationMax
      ? `${foyer.estimationMin}`
      : `${foyer.estimationMin} à ${foyer.estimationMax}`;
  const detail = `${foyer.declare} ${accord(foyer.declare, "déclarée")}, ${decimal(foyer.nombreParts)} parts pour ${foyer.declarants} ${accord(foyer.declarants, "déclarant")}, soit ${estimation} ${accord(foyer.estimationMax ?? 0, "estimée")}`;
  if (foyer.statut === STATUTS_CONTROLE.COHERENT) return `${titre} : cohérent (${detail})`;
  return `${titre} : à vérifier (${detail} ; estimation indicative)`;
}

function ligneAnnee({ annee }: ResultatControleAvisImpot): string {
  const titre = "Année des revenus";
  if (annee.statut === STATUTS_CONTROLE.NON_VERIFIABLE) return `${titre} : non vérifiable`;
  if (annee.statut === STATUTS_CONTROLE.COHERENT) return `${titre} : cohérente (${annee.attendue})`;
  return `${titre} : à vérifier (${annee.lues.join(", ")} ${accord(annee.lues.length, "lue")}, ${annee.attendue} attendue)`;
}

/** Détail chiffré du contrôle, pour les scripts d'inspection : jamais écrit dans DN (montants). */
export function formaterDetailControle(resultat: ResultatControleAvisImpot): string {
  const entete = `Contrôle : ${LIBELLES_STATUT_CONTROLE[resultat.statut]}`;
  let lignes: string[];
  if (resultat.avisDeposes === 0) lignes = [entete, "Aucun avis d'imposition déposé."];
  else if (resultat.avisLus === 0) {
    lignes = [
      entete,
      ligneAvis(resultat),
      "Aucun 2D-Doc lu (avis scanné, photographié ou sans code) : vérification manuelle.",
    ];
  } else lignes = [entete, ligneAvis(resultat), ligneRevenu(resultat), ligneFoyer(resultat), ligneAnnee(resultat)];

  return lignes.join("\n");
}
