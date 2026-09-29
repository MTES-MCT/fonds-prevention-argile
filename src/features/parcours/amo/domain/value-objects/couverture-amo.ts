import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";
import { parseCodesDepartement } from "@/shared/utils/departements.utils";
import { getDemandeurFirstLogement, type ParcoursSimulationPair } from "@/shared/domain/utils/rga-simulation.utils";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../../utils/amo.utils";

/** Territoire d'un logement, tel que la couverture d'une AMO le lit. */
export interface TerritoireAmo {
  codeInsee: string;
  codeEpci: string | null;
}

/** Du plus précis au plus large : une AMO rattachée à la commune prime sur celle de l'EPCI. */
export type NiveauCouverture = "commune" | "epci" | "departement";

const NIVEAUX: readonly NiveauCouverture[] = ["commune", "epci", "departement"];

/** Ce qu'une AMO déclare couvrir : `departements` est le champ libre de l'import. */
export interface CouvertureDeclaree {
  id: string;
  nom: string;
  departements: string | null;
  communes: readonly string[];
  epcis: readonly string[];
}

/** Territoire du logement, USER-first avec repli agent comme la résolution territoriale. */
export function territoireDuParcours(parcours: ParcoursSimulationPair): TerritoireAmo | null {
  const logement = getDemandeurFirstLogement(parcours);
  const codeInsee = normalizeCodeInsee(logement?.commune);
  if (!codeInsee) return null;
  const codeEpci = logement?.epci ? String(logement.epci).trim() : "";
  return { codeInsee, codeEpci: codeEpci || null };
}

/** Niveau le plus précis auquel l'AMO couvre le territoire, `null` si elle ne le couvre pas. */
export function niveauCouverture(amo: CouvertureDeclaree, territoire: TerritoireAmo): NiveauCouverture | null {
  if (amo.communes.includes(territoire.codeInsee)) return "commune";
  if (territoire.codeEpci && amo.epcis.includes(territoire.codeEpci)) return "epci";

  // Le champ libre est parsé en codes : un `LIKE '%5%'` faisait couvrir le 54 par une AMO du 25.
  const departement = normalizeCodeDepartement(getCodeDepartementFromCodeInsee(territoire.codeInsee));
  const declares = parseCodesDepartement(amo.departements).map(normalizeCodeDepartement);
  return declares.includes(departement) ? "departement" : null;
}

/**
 * AMO proposées pour un territoire : celles du niveau le plus précis qui en compte au moins une,
 * sans jamais mélanger deux niveaux. Ordre alphabétique puis par id, pour que la liste affichée
 * et toute attribution automatique ne dépendent pas de l'ordre de lecture de la base.
 */
export function amosDuTerritoire<T extends CouvertureDeclaree>(amos: readonly T[], territoire: TerritoireAmo): T[] {
  const parNiveau = new Map<NiveauCouverture, T[]>();
  for (const amo of amos) {
    const niveau = niveauCouverture(amo, territoire);
    if (!niveau) continue;
    const liste = parNiveau.get(niveau);
    if (liste) liste.push(amo);
    else parNiveau.set(niveau, [amo]);
  }

  const retenues = NIVEAUX.map((niveau) => parNiveau.get(niveau)).find((liste) => liste && liste.length > 0) ?? [];
  return [...retenues].sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.id.localeCompare(b.id));
}

/** Refus quand plusieurs AMO couvrent le territoire et que personne n'a désigné la sienne. */
export const ERREUR_CHOIX_AMO_REQUIS = "Plusieurs AMO couvrent ce territoire : l'AMO à solliciter doit être choisie.";

/** Refus quand aucune AMO ne couvre le territoire, reconnu tel quel par les écrans. */
export const ERREUR_AUCUNE_AMO = "Aucun AMO disponible pour le territoire du demandeur";

export type ResolutionAmo<T> = { statut: "aucune" } | { statut: "unique"; amo: T } | { statut: "plusieurs"; amos: T[] };

/** Une attribution automatique n'a de sens qu'avec une seule AMO : au-delà, quelqu'un doit choisir. */
export function resoudreAmo<T>(amos: readonly T[]): ResolutionAmo<T> {
  if (amos.length === 0) return { statut: "aucune" };
  if (amos.length === 1) return { statut: "unique", amo: amos[0] };
  return { statut: "plusieurs", amos: [...amos] };
}
