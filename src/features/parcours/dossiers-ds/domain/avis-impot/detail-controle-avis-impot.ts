import { STATUTS_CONTROLE, type ResultatControleAvisImpot, type StatutControle } from "./controle-avis-impot";

/** Limite fixée sur l'annotation DN, que l'API n'expose pas. */
export const LIMITE_ANNOTATION_CONTROLE = 500;

export const LIBELLES_STATUT_CONTROLE: Record<StatutControle, string> = {
  [STATUTS_CONTROLE.COHERENT]: "Cohérent",
  [STATUTS_CONTROLE.A_VERIFIER]: "À vérifier",
  [STATUTS_CONTROLE.NON_VERIFIABLE]: "Non vérifiable",
};

const DATE_FR = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Espace simple plutôt que l'espace fine de toLocaleString, pour un texte DN lisible partout.
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
  let impact = "tranche non calculée (région inconnue)";
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

/** Texte de l'annotation DN : statut et date en tête, une ligne par critère, 500 caractères au plus. */
export function formaterDetailControle(resultat: ResultatControleAvisImpot, dateControle: Date): string {
  const entete = `${LIBELLES_STATUT_CONTROLE[resultat.statut]} (contrôle automatique FPA du ${DATE_FR.format(dateControle)})`;
  let lignes: string[];
  if (resultat.avisDeposes === 0) lignes = [entete, "Aucun avis d'imposition déposé."];
  else if (resultat.avisLus === 0) {
    lignes = [
      entete,
      ligneAvis(resultat),
      "Aucun 2D-Doc lu (avis scanné, photographié ou sans code) : vérification manuelle.",
    ];
  } else lignes = [entete, ligneAvis(resultat), ligneRevenu(resultat), ligneFoyer(resultat), ligneAnnee(resultat)];

  const texte = lignes.join("\n");
  return texte.length <= LIMITE_ANNOTATION_CONTROLE ? texte : `${texte.slice(0, LIMITE_ANNOTATION_CONTROLE - 1)}…`;
}

/** Contenu hors date : deux contrôles au même résultat ne réécrivent pas l'annotation. */
export function contenuSansDate(texte: string | null): string | null {
  return texte?.replace(/ du \d{2}\/\d{2}\/\d{4}\)/, ")") ?? null;
}
