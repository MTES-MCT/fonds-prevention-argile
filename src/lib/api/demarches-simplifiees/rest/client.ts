import { getServerEnv } from "@/lib/config/env.config";
import { Step } from "@/lib/parcours/parcours.types";
import type {
  PrefillData,
  CreateDossierResponse,
  DemarcheSchema,
  DemarcheStats,
} from "./types";
import { getDemarcheUrl } from "@/lib/parcours/demarches.helpers";

export type DemarcheType = "ELIGIBILITE" | "DIAGNOSTIC" | "DEVIS" | "FACTURES";

export class DemarchesSimplifieesPrefillClient {
  private baseUrl: string;
  private publicUrl: string;
  private demarcheConfigs: Record<DemarcheType, { id: string; nom: string }>;

  constructor() {
    const env = getServerEnv();

    this.baseUrl = env.DEMARCHES_SIMPLIFIEES_REST_API_URL;
    // URL publique pour les endpoints non-API (schema, preremplir, etc.)
    this.publicUrl = this.baseUrl.replace("/api/public/v1", "");

    // Configuration des 4 démarches
    this.demarcheConfigs = {
      ELIGIBILITE: {
        id: env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE,
        nom: env.DEMARCHES_SIMPLIFIEES_NOM_ELIGIBILITE,
      },
      DIAGNOSTIC: {
        id: env.DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC,
        nom: env.DEMARCHES_SIMPLIFIEES_NOM_DIAGNOSTIC,
      },
      DEVIS: {
        id: env.DEMARCHES_SIMPLIFIEES_ID_DEVIS,
        nom: env.DEMARCHES_SIMPLIFIEES_NOM_DEVIS,
      },
      FACTURES: {
        id: env.DEMARCHES_SIMPLIFIEES_ID_FACTURES,
        nom: env.DEMARCHES_SIMPLIFIEES_NOM_FACTURES,
      },
    };
  }

  /**
   * Convertit une étape du parcours en type de démarche
   */
  private stepToDemarcheType(step: Step): DemarcheType {
    switch (step) {
      case Step.ELIGIBILITE:
        return "ELIGIBILITE";
      case Step.DIAGNOSTIC:
        return "DIAGNOSTIC";
      case Step.DEVIS:
        return "DEVIS";
      case Step.FACTURES:
        return "FACTURES";
      default:
        throw new Error(`Étape non supportée: ${step}`);
    }
  }

  /**
   * Récupère la configuration d'une démarche
   */
  private getConfig(demarcheType: DemarcheType | Step) {
    // Si c'est un Step, on le convertit
    const type =
      typeof demarcheType === "string" && demarcheType in this.demarcheConfigs
        ? (demarcheType as DemarcheType)
        : this.stepToDemarcheType(demarcheType as Step);

    const config = this.demarcheConfigs[type];

    if (!config) {
      throw new Error(`Configuration manquante pour la démarche: ${type}`);
    }

    if (!config.id || !config.nom) {
      throw new Error(`Configuration incomplète pour la démarche: ${type}`);
    }

    return config;
  }

  /**
   * Récupère le schéma d'une démarche
   * Endpoint: /preremplir/{nom-demarche}/schema
   */
  async getSchema(demarcheType: DemarcheType | Step): Promise<DemarcheSchema> {
    const config = this.getConfig(demarcheType);
    const url = `${this.publicUrl}/preremplir/${config.nom}/schema`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération du schéma pour ${demarcheType}: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Crée un dossier prérempli via POST
   * Endpoint: /api/public/v1/demarches/{id}/dossiers
   */
  async createPrefillDossier(
    data: PrefillData,
    demarcheType: DemarcheType | Step
  ): Promise<CreateDossierResponse> {
    const config = this.getConfig(demarcheType);
    const url = `${this.baseUrl}/demarches/${config.id}/dossiers`;

    console.log(`📤 Création dossier ${demarcheType} (ID: ${config.id})`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;

      // Lire le texte une seule fois
      const errorText = await response.text();

      if (errorText) {
        // Essayer de parser en JSON si possible
        try {
          const errorData = JSON.parse(errorText);
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch {
          // Si ce n'est pas du JSON, utiliser le texte brut
          errorMessage += ` - ${errorText}`;
        }
      }

      throw new Error(
        `Erreur création dossier ${demarcheType}: ${errorMessage}`
      );
    }

    return response.json();
  }

  /**
   * Récupère les statistiques d'une démarche
   * Endpoint: /api/public/v1/demarches/{id}/stats
   */
  async getStats(demarcheType: DemarcheType | Step): Promise<DemarcheStats> {
    const config = this.getConfig(demarcheType);
    const url = `${this.baseUrl}/demarches/${config.id}/stats`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Erreur récupération stats ${demarcheType}: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Méthode helper pour valider les données avant envoi
   */
  validatePrefillData(data: PrefillData, schema?: DemarcheSchema): string[] {
    const errors: string[] = [];

    // Validation basique
    Object.entries(data).forEach(([key]) => {
      if (!key.startsWith("champ_")) {
        errors.push(
          `Clé invalide: ${key}. Les clés doivent commencer par 'champ_'`
        );
      }
    });

    // Validation avec le schéma si fourni
    if (schema) {
      const champIds = schema.revision.champDescriptors.map((c) => c.id);
      const requiredChamps = schema.revision.champDescriptors
        .filter((c) => c.required)
        .map((c) => c.id);

      // Vérifier les champs requis
      requiredChamps.forEach((id) => {
        if (!(id in data) || data[id] === null || data[id] === "") {
          const champ = schema.revision.champDescriptors.find(
            (c) => c.id === id
          );
          errors.push(`Champ requis manquant: ${champ?.label || id}`);
        }
      });

      // Vérifier que les clés correspondent à des champs existants
      Object.keys(data).forEach((key) => {
        if (!champIds.includes(key)) {
          errors.push(`Champ inconnu: ${key}`);
        }
      });
    }

    return errors;
  }

  /**
   * Récupère l'ID de démarche pour une étape
   * Utile pour créer le dossier dans le parcours
   */
  getDemarcheId(demarcheType: DemarcheType | Step): string {
    const config = this.getConfig(demarcheType);
    return config.id;
  }
}

// Export d'une instance singleton
export const prefillClient = new DemarchesSimplifieesPrefillClient();
