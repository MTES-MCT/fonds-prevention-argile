import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import type { EligibilityChecks } from "../entities/eligibility-result.entity";
import { calculateNiveauRevenuFromRga } from "../types/rga-revenus.types";

type SimulationLike = RGASimulationData | PartialRGASimulationData;

/**
 * Champs d'une simulation présentés à l'utilisateur, sous forme de badges.
 * Source unique du couple (extraction, formatage) partagé par le diff agent
 * (`buildAgentEditInfo`) et le récapitulatif demandeur (`SimulationRecap`).
 */
export interface SimulationField {
  /** Clé stable : aussi la clé d'annotation de `InfoLogement`. */
  key: string;
  /** Libellé lisible, côté demandeur. `InfoLogement` garde les siens dans son JSX. */
  label: string;
  getValue: (data: SimulationLike) => unknown;
  formatValue: (value: unknown) => string;
  /** Critère d'éligibilité porté par ce champ, pour signaler celui qui bloque. */
  checkKey: keyof EligibilityChecks;
}

/** Valeur absente : ne jamais afficher un faux « avant » sur un baseline partiel (early exit). */
const ABSENT = "—";

/**
 * L'ordre est celui de `InfoLogement` et du récapitulatif.
 */
export const SIMULATION_FIELDS: readonly SimulationField[] = [
  {
    key: "typeLogement",
    label: "Type de logement",
    getValue: (d) => d.logement?.type,
    formatValue: (v) => (v == null ? ABSENT : v === "maison" ? "MAISON" : "APPARTEMENT"),
    checkKey: "maison",
  },
  {
    key: "mitoyennete",
    label: "Mitoyenneté",
    getValue: (d) => d.logement?.mitoyen,
    formatValue: (v) => (v == null ? ABSENT : v ? "OUI" : "NON"),
    checkKey: "nonMitoyen",
  },
  {
    key: "assurance",
    label: "Assurance",
    getValue: (d) => d.rga?.assure,
    formatValue: (v) => (v == null ? ABSENT : v ? "OUI" : "NON"),
    checkKey: "assurance",
  },
  {
    key: "proprietaireOccupant",
    label: "Propriétaire occupant",
    getValue: (d) => d.logement?.proprietaire_occupant,
    formatValue: (v) => (v == null ? ABSENT : v ? "OUI" : "NON"),
    checkKey: "proprietaireOccupant",
  },
  {
    key: "zoneExposition",
    label: "Risque argile",
    getValue: (d) => d.logement?.zone_dexposition,
    formatValue: (v) => (v == null ? ABSENT : String(v).toUpperCase()),
    checkKey: "zoneForte",
  },
  {
    key: "anneeConstruction",
    label: "Année de construction",
    getValue: (d) => d.logement?.annee_de_construction,
    formatValue: (v) => (v == null ? ABSENT : String(v)),
    checkKey: "anneeConstruction",
  },
  {
    key: "nombreNiveaux",
    label: "Nombre de niveau",
    getValue: (d) => d.logement?.niveaux,
    formatValue: (v) => (v == null ? ABSENT : `${v} ${Number(v) > 1 ? "NIVEAUX" : "NIVEAU"}`),
    checkKey: "niveaux",
  },
  {
    key: "etatMaison",
    label: "État de la maison",
    getValue: (d) => d.rga?.sinistres,
    formatValue: (v) => (v == null ? ABSENT : String(v).toUpperCase()),
    checkKey: "etatMaisonEligible",
  },
  {
    key: "indemnisationPasseeRGA",
    label: "Indemn. RGA ?",
    getValue: (d) => d.rga?.indemnise_indemnise_rga,
    formatValue: (v) => (v == null ? ABSENT : v ? "OUI" : "NON"),
    checkKey: "indemnisation",
  },
  {
    key: "montantIndemnisation",
    label: "Montant de l'indemnité",
    getValue: (d) => d.rga?.indemnise_montant_indemnite,
    formatValue: (v) => {
      if (v == null) return ABSENT;
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
        Number(v)
      );
    },
    checkKey: "indemnisation",
  },
  {
    key: "nombreHabitants",
    label: "Habitants du logement",
    getValue: (d) => d.menage?.personnes,
    formatValue: (v) => (v == null ? ABSENT : `${v} ${Number(v) > 1 ? "HABITANTS" : "HABITANT"}`),
    checkKey: "revenusEligibles",
  },
  {
    key: "niveauRevenu",
    label: "Revenus du foyer",
    // La tranche calculée, pas le revenu brut : c'est elle qui décide de l'éligibilité.
    getValue: (d) => calculateNiveauRevenuFromRga(d),
    formatValue: (v) => {
      if (!v) return ABSENT;
      const s = String(v);
      if (s === "Très modeste") return "MÉNAGE TRÈS MODESTE";
      if (s === "Modeste") return "MÉNAGE MODESTE";
      return s.toUpperCase();
    },
    checkKey: "revenusEligibles",
  },
];

export const SIMULATION_FIELDS_BY_KEY: Readonly<Record<string, SimulationField>> = Object.fromEntries(
  SIMULATION_FIELDS.map((field) => [field.key, field])
);

/**
 * Clés des champs dont la valeur diffère entre deux simulations. Un champ absent
 * du côté `apres` est ignoré : une simulation coupée par un early exit n'a pas
 * tous les champs, et son silence ne vaut pas changement.
 */
export function diffSimulationFields(
  avant: SimulationLike | null | undefined,
  apres: SimulationLike | null | undefined
): string[] {
  if (!avant || !apres) return [];

  return SIMULATION_FIELDS.filter((field) => {
    const valeurApres = field.getValue(apres);
    if (valeurApres === undefined || valeurApres === null) return false;
    return field.getValue(avant) !== valeurApres;
  }).map((field) => field.key);
}
