import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import type { AgentEditInfo } from "@/features/backoffice/espace-agent/demandes/domain/types/demande-detail.types";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import { calculateNiveauRevenuFromRga } from "@/features/simulateur/domain/types/rga-revenus.types";

/**
 * Définition d'un champ à comparer entre données initiales et données agent.
 * La clé `infoLogementKey` correspond au champ InfoLogement qui sera annoté dans le composant.
 */
interface ComparisonField {
  /** Clé du champ dans InfoLogement (pour le composant) */
  infoLogementKey: string;
  /** Extracteur de la valeur brute depuis les données RGA */
  getValue: (data: RGASimulationData) => unknown;
  /** Formateur pour l'affichage */
  formatValue: (value: unknown, rgaData?: RGASimulationData) => string;
}

/**
 * Champs comparés entre données initiales et données agent.
 * L'ordre correspond à l'affichage dans InfoLogement.
 */
const COMPARISON_FIELDS: ComparisonField[] = [
  {
    infoLogementKey: "zoneExposition",
    getValue: (d) => d.logement?.zone_dexposition,
    formatValue: (v) => String(v).toUpperCase(),
  },
  {
    infoLogementKey: "anneeConstruction",
    getValue: (d) => d.logement?.annee_de_construction,
    formatValue: (v) => String(v),
  },
  {
    infoLogementKey: "nombreNiveaux",
    getValue: (d) => d.logement?.niveaux,
    formatValue: (v) => `${v} ${Number(v) > 1 ? "NIVEAUX" : "NIVEAU"}`,
  },
  {
    infoLogementKey: "etatMaison",
    getValue: (d) => d.rga?.sinistres,
    formatValue: (v) => String(v).toUpperCase(),
  },
  {
    infoLogementKey: "indemnisationPasseeRGA",
    getValue: (d) => d.rga?.indemnise_indemnise_rga,
    formatValue: (v) => (v ? "OUI" : "NON"),
  },
  {
    infoLogementKey: "montantIndemnisation",
    getValue: (d) => d.rga?.indemnise_montant_indemnite,
    formatValue: (v) => {
      if (v === null || v === undefined) return "—";
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
        Number(v),
      );
    },
  },
  {
    infoLogementKey: "nombreHabitants",
    getValue: (d) => d.menage?.personnes,
    formatValue: (v) => `${v} ${Number(v) > 1 ? "HABITANTS" : "HABITANT"}`,
  },
  {
    infoLogementKey: "niveauRevenu",
    getValue: (d) => {
      // On compare la tranche calculée, pas le revenu brut
      return calculateNiveauRevenuFromRga(d);
    },
    formatValue: (v) => {
      if (!v) return "—";
      const s = String(v);
      if (s === "Très modeste") return "MÉNAGE TRÈS MODESTE";
      if (s === "Modeste") return "MÉNAGE MODESTE";
      return s.toUpperCase();
    },
  },
];

/**
 * Construit les informations de diff agent pour un parcours donné.
 *
 * @param parcours - Objet avec les champs RGA du parcours_prevention
 * @returns AgentEditInfo si des données agent existent, null sinon
 */
export async function buildAgentEditInfo(parcours: {
  rgaSimulationData: RGASimulationData | null;
  rgaSimulationDataAgent: RGASimulationData | null;
  rgaSimulationAgentEditedAt: Date | null;
  rgaSimulationAgentEditedBy: string | null;
}): Promise<AgentEditInfo | null> {
  // Pas de données agent → pas de diff
  if (!parcours.rgaSimulationDataAgent || !parcours.rgaSimulationAgentEditedAt) {
    return null;
  }

  const initial = parcours.rgaSimulationData;
  const edited = parcours.rgaSimulationDataAgent;

  // Si pas de données initiales, on ne peut pas faire de diff
  if (!initial) {
    return null;
  }

  // Résoudre le nom de l'agent
  let agentPrenom = "";
  let agentNom = "Agent";
  if (parcours.rgaSimulationAgentEditedBy) {
    const agent = await agentsRepository.findById(parcours.rgaSimulationAgentEditedBy);
    if (agent) {
      agentPrenom = agent.givenName || "";
      agentNom = agent.usualName || "";
    }
  }

  // Comparer champ par champ
  const originalDisplayValues: Record<string, string> = {};

  for (const field of COMPARISON_FIELDS) {
    const oldValue = field.getValue(initial);
    const newValue = field.getValue(edited);

    // Ignorer si valeurs identiques (comparaison simple)
    if (oldValue === newValue) continue;

    // Ignorer si la nouvelle valeur n'est pas définie
    if (newValue === undefined || newValue === null) continue;

    // Stocker la valeur originale formatée
    originalDisplayValues[field.infoLogementKey] = field.formatValue(oldValue, initial);
  }

  const nombreModifications = Object.keys(originalDisplayValues).length;

  // S'il n'y a aucune modification détectée, ne pas afficher le bandeau
  if (nombreModifications === 0) {
    return null;
  }

  return {
    agentPrenom,
    agentNom,
    editedAt: parcours.rgaSimulationAgentEditedAt,
    nombreModifications,
    originalDisplayValues,
  };
}
