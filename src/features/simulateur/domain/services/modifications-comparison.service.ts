import type { RGASimulationData, PartialRGASimulationData } from "@/shared/domain/types";
import type { EligibilityChecks } from "../entities/eligibility-result.entity";
import { calculerTrancheRevenu } from "../types/rga-revenus.types";

/**
 * Représente une modification faite par l'agent sur une donnée de simulation
 */
export interface Modification {
  /** Label lisible (ex: "Habitants du logement") */
  label: string;
  /** Valeur avant modification (formatée pour l'affichage) */
  beforeDisplay: string;
  /** Valeur après modification (formatée pour l'affichage) */
  afterDisplay: string;
  /** Le critère d'éligibilité lié était-il passé avant ? */
  wasEligible: boolean;
  /** Le critère d'éligibilité lié est-il passé maintenant ? */
  isEligible: boolean;
}

/**
 * Définition d'un champ à comparer entre les données initiales et modifiées
 */
interface ComparisonField {
  label: string;
  getOldValue: (data: RGASimulationData) => unknown;
  getNewValue: (data: PartialRGASimulationData) => unknown;
  formatValue: (value: unknown) => string;
  checkKey: keyof EligibilityChecks;
}

/**
 * Champs comparables entre données initiales et données éditées
 */
const COMPARISON_FIELDS: ComparisonField[] = [
  {
    label: "Type de logement",
    getOldValue: (d) => d.logement.type,
    getNewValue: (d) => d.logement?.type,
    formatValue: (v) => (v === "maison" ? "Maison" : "Appartement"),
    checkKey: "maison",
  },
  {
    label: "Nombre de niveaux",
    getOldValue: (d) => d.logement.niveaux,
    getNewValue: (d) => d.logement?.niveaux,
    formatValue: (v) => `${v} niveau${Number(v) > 1 ? "x" : ""}`,
    checkKey: "niveaux",
  },
  {
    label: "État de la maison",
    getOldValue: (d) => d.rga.sinistres,
    getNewValue: (d) => d.rga?.sinistres,
    formatValue: (v) => {
      const labels: Record<string, string> = {
        saine: "Saine",
        "très peu endommagée": "Très peu endommagée",
        endommagée: "Endommagée",
      };
      return labels[String(v)] ?? String(v);
    },
    checkKey: "etatMaison",
  },
  {
    label: "Mitoyenneté",
    getOldValue: (d) => d.logement.mitoyen,
    getNewValue: (d) => d.logement?.mitoyen,
    formatValue: (v) => (v ? "Oui" : "Non"),
    checkKey: "nonMitoyen",
  },
  {
    label: "Indemnisation RGA",
    getOldValue: (d) => d.rga.indemnise_indemnise_rga,
    getNewValue: (d) => d.rga?.indemnise_indemnise_rga,
    formatValue: (v) => (v ? "Oui" : "Non"),
    checkKey: "indemnisation",
  },
  {
    label: "Assurance",
    getOldValue: (d) => d.rga.assure,
    getNewValue: (d) => d.rga?.assure,
    formatValue: (v) => (v ? "Oui" : "Non"),
    checkKey: "assurance",
  },
  {
    label: "Propriétaire occupant",
    getOldValue: (d) => d.logement.proprietaire_occupant,
    getNewValue: (d) => d.logement?.proprietaire_occupant,
    formatValue: (v) => (v ? "Oui" : "Non"),
    checkKey: "proprietaireOccupant",
  },
  {
    label: "Habitants du logement",
    getOldValue: (d) => d.menage.personnes,
    getNewValue: (d) => d.menage?.personnes,
    formatValue: (v) => `${v} habitant${Number(v) > 1 ? "s" : ""}`,
    checkKey: "revenusEligibles",
  },
  {
    label: "Revenus",
    getOldValue: (d) => {
      const personnes = d.menage.personnes;
      return calculerTrancheRevenu(d.menage.revenu_rga, personnes, false);
    },
    getNewValue: (d) => {
      const revenu = d.menage?.revenu_rga;
      const personnes = d.menage?.personnes;
      if (revenu === undefined || !personnes) return undefined;
      return calculerTrancheRevenu(revenu, personnes, false);
    },
    formatValue: (v) => {
      const labels: Record<string, string> = {
        "très modeste": "Très modeste",
        modeste: "Modeste",
        intermédiaire: "Intermédiaire",
        supérieure: "Supérieure",
      };
      return labels[String(v)] ?? String(v);
    },
    checkKey: "revenusEligibles",
  },
];

/**
 * Compare les données initiales et les données éditées pour détecter les modifications.
 * Retourne la liste des champs modifiés avec leur impact sur l'éligibilité.
 */
export function computeModifications(
  initialData: RGASimulationData,
  currentAnswers: PartialRGASimulationData,
  initialChecks: EligibilityChecks,
  currentChecks: EligibilityChecks,
): Modification[] {
  const modifications: Modification[] = [];

  for (const field of COMPARISON_FIELDS) {
    const oldValue = field.getOldValue(initialData);
    const newValue = field.getNewValue(currentAnswers);

    // Ignorer si la nouvelle valeur n'est pas définie (champ non touché)
    if (newValue === undefined) continue;

    // Ignorer si les valeurs sont identiques
    if (oldValue === newValue) continue;

    const wasEligible = initialChecks[field.checkKey] === true;
    const isEligible = currentChecks[field.checkKey] === true;

    modifications.push({
      label: field.label,
      beforeDisplay: field.formatValue(oldValue),
      afterDisplay: field.formatValue(newValue),
      wasEligible,
      isEligible,
    });
  }

  return modifications;
}
