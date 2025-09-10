import { getServerEnv } from "@/lib/config/env.config";
import type {
  PrefillData,
  CreateDossierResponse,
  DemarcheSchema,
  DemarcheStats,
} from "./types";

export class DemarchesSimplifieesPrefillClient {
  private baseUrl: string;
  private publicUrl: string;
  private idDemarche: string;
  private nomDemarche: string;

  constructor() {
    const env = getServerEnv();

    this.baseUrl = env.DEMARCHES_SIMPLIFIEES_REST_API_URL;
    // URL publique pour les endpoints non-API (schema, preremplir, etc.)
    this.publicUrl = this.baseUrl.replace("/api/public/v1", "");
    this.idDemarche = env.DEMARCHES_SIMPLIFIEES_ID_DEMARCHE;
    this.nomDemarche = env.DEMARCHES_SIMPLIFIEES_NOM_DEMARCHE;
  }

  /**
   * Récupère le schéma de la démarche
   * Endpoint: /preremplir/{nom-demarche}/schema
   */
  async getSchema(): Promise<DemarcheSchema> {
    const url = `${this.publicUrl}/preremplir/${this.nomDemarche}/schema`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store", // Désactive le cache pour avoir toujours la dernière version
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération du schéma: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Crée un dossier prérempli via POST
   * Endpoint: /api/public/v1/demarches/{id}/dossiers
   */
  async createPrefillDossier(
    data: PrefillData
  ): Promise<CreateDossierResponse> {
    const url = `${this.baseUrl}/demarches/${this.idDemarche}/dossiers`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${JSON.stringify(errorData)}`;
      } catch {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(`Erreur lors de la création du dossier: ${errorMessage}`);
    }

    return response.json();
  }

  /**
   * Génère l'URL de préremplissage en GET
   * Limite: environ 2000 caractères selon les navigateurs
   */
  generatePrefillUrl(data: PrefillData): string {
    const baseUrl = `${this.publicUrl}/commencer/${this.nomDemarche}`;
    const params = new URLSearchParams();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });

    const url = `${baseUrl}?${params.toString()}`;

    // Avertissement si l'URL est trop longue
    if (url.length > 2000) {
      console.warn(
        `URL de préremplissage très longue (${url.length} caractères). Considérez l'utilisation de la méthode POST.`
      );
    }

    return url;
  }

  /**
   * Récupère les statistiques de la démarche
   * Endpoint: /api/public/v1/demarches/{id}/stats
   */
  async getStats(): Promise<DemarcheStats> {
    const url = `${this.baseUrl}/demarches/${this.idDemarche}/stats`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération des statistiques: ${response.status} ${response.statusText}`
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
}

// Export d'une instance singleton
export const prefillClient = new DemarchesSimplifieesPrefillClient();
