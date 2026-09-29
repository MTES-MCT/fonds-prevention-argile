import { STATUTS_CONTROLE, type ResultatControleAvisImpot, type StatutControle } from "./controle-avis-impot";

/** Libellés contractuels : ce sont les options de la liste déroulante de l'annotation DN. */
export const LIBELLES_STATUT_CONTROLE: Record<StatutControle, string> = {
  [STATUTS_CONTROLE.COHERENT]: "Cohérent",
  [STATUTS_CONTROLE.A_VERIFIER]: "À vérifier",
  [STATUTS_CONTROLE.NON_VERIFIABLE]: "Non vérifiable",
};

// Espace simple plutôt que l'espace fine de toLocaleString, pour un texte DN lisible partout.
function euros(montant: number): string {
  return `${String(Math.abs(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
}

function decimal(valeur: number): string {
  return String(valeur).replace(".", ",");
}

function pluriel(nombre: number, mot: string): string {
  return `${nombre} ${mot}${nombre > 1 ? "s" : ""}`;
}

function ligneAvis(r: ResultatControleAvisImpot): string {
  const doublons =
    r.doublonsIgnores > 0
      ? ` (${pluriel(r.doublonsIgnores, "doublon")} ignoré${r.doublonsIgnores > 1 ? "s" : ""})`
      : "";
  const nonLus = r.avisNonLus > 0 ? `, ${r.avisNonLus} non lu${r.avisNonLus > 1 ? "s" : ""}` : "";
  return `Avis lus : ${r.avisLus} sur ${pluriel(r.avisDeposes, "pièce")} déposée${r.avisDeposes > 1 ? "s" : ""}${nonLus}${doublons}`;
}

function ligneRevenu({ revenu }: ResultatControleAvisImpot): string {
  const titre = "Revenu fiscal de référence";
  if (revenu.declare === null) return `${titre} : non vérifiable (non renseigné par le demandeur)`;
  if (revenu.avis === null) return `${titre} : non vérifiable (tous les avis n'ont pas pu être lus)`;
  const valeurs = `déclaré ${euros(revenu.declare)}, avis ${euros(revenu.avis)}`;
  if (revenu.ecart === 0) return `${titre} : cohérent (${valeurs})`;

  const signe = (revenu.ecart ?? 0) > 0 ? "+" : "-";
  let impact = "tranche non calculée (région du logement inconnue)";
  if (revenu.trancheDeclaree && revenu.trancheAvis) {
    if (revenu.trancheAvis === "supérieure") impact = `devient inéligible (tranche ${revenu.trancheAvis})`;
    else if (revenu.trancheDeclaree === revenu.trancheAvis) impact = `tranche inchangée (${revenu.trancheAvis})`;
    else impact = `tranche ${revenu.trancheDeclaree} → ${revenu.trancheAvis}`;
  }
  return `${titre} : écart de ${signe}${euros(revenu.ecart ?? 0)} (${valeurs}) ; ${impact}`;
}

function ligneFoyer({ foyer }: ResultatControleAvisImpot): string {
  const titre = "Personnes du ménage";
  if (foyer.nombreParts === null || foyer.estimationMin === null) {
    return `${titre} : non vérifiable (nombre de parts non lu sur tous les avis)`;
  }
  if (foyer.declare === null) return `${titre} : non vérifiable (non renseigné par le demandeur)`;
  const estimation =
    foyer.estimationMin === foyer.estimationMax
      ? `${foyer.estimationMin} estimée${foyer.estimationMin > 1 ? "s" : ""}`
      : `${foyer.estimationMin} à ${foyer.estimationMax} estimées`;
  const detail = `${foyer.declare} déclarée${foyer.declare > 1 ? "s" : ""}, ${decimal(foyer.nombreParts)} parts pour ${pluriel(foyer.declarants, "déclarant")} : ${estimation}`;
  if (foyer.statut === STATUTS_CONTROLE.COHERENT) return `${titre} : cohérent (${detail})`;
  return `${titre} : à vérifier (${detail}). Estimation indicative : invalidité, garde alternée ou situation familiale modifient le nombre de parts`;
}

function ligneAnnee({ annee }: ResultatControleAvisImpot): string {
  const titre = "Année des revenus";
  if (annee.statut === STATUTS_CONTROLE.NON_VERIFIABLE) return `${titre} : non vérifiable`;
  if (annee.statut === STATUTS_CONTROLE.COHERENT) return `${titre} : cohérente (${annee.attendue})`;
  return `${titre} : à vérifier (revenus ${annee.lues.join(", ")} lus, ${annee.attendue} attendus)`;
}

/** Texte de l'annotation « Détail du contrôle », une ligne par critère. */
export function formaterDetailControle(resultat: ResultatControleAvisImpot): string {
  const entete = `Contrôle automatique de l'avis d'imposition : ${LIBELLES_STATUT_CONTROLE[resultat.statut]}`;
  if (resultat.avisDeposes === 0) return `${entete}\nAucun avis d'imposition déposé.`;
  if (resultat.avisLus === 0) {
    return `${entete}\n${ligneAvis(resultat)}\nAucun 2D-Doc lu (avis scanné, photographié ou sans code) : vérification manuelle.`;
  }
  return [entete, ligneAvis(resultat), ligneRevenu(resultat), ligneFoyer(resultat), ligneAnnee(resultat)].join("\n");
}
