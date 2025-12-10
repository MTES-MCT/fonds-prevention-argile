import { catastrophesNaturellesRepository } from "@/shared/database/repositories";
import { parseFrenchDateToSql } from "@/shared/utils";
import { delay } from "@/shared/utils";
import { API_GEORISQUES } from "../../domain/config/seo.config";
import { fetchCatnatByCodeInsee, fetchCatnatByCodesInsee, type ApiGeorisquesCatnat } from "../adapters/georisques";
import type { NewCatastropheNaturelle } from "@/shared/database/schema/catastrophes-naturelles";
import { CATNAT_RGA_TYPES } from "../domain";

/**
 * Statistiques d'import des catastrophes naturelles
 */
export interface CatnatImportStats {
  totalCommunes: number;
  communesProcessed: number;
  communesSuccess: number;
  communesFailed: number;
  totalCatnat: number;
  catnatImported: number;
  catnatSkipped: number; // Anciennes (> 20 ans)
  errors: Array<{ codeInsee: string; error: string }>;
}

/**
 * Callback de progression pour l'import
 */
export type CatnatProgressCallback = (stats: Partial<CatnatImportStats>) => void;

/**
 * Service pour gérer les catastrophes naturelles
 */
export const catnatService = {
  /**
   * Transforme une catastrophe de l'API vers le format BDD
   */
  transformApiToDb(apiCatnat: ApiGeorisquesCatnat): NewCatastropheNaturelle {
    return {
      codeNationalCatnat: apiCatnat.code_national_catnat,
      dateDebutEvt: parseFrenchDateToSql(apiCatnat.date_debut_evt),
      dateFinEvt: parseFrenchDateToSql(apiCatnat.date_fin_evt),
      datePublicationArrete: parseFrenchDateToSql(apiCatnat.date_publication_arrete),
      datePublicationJo: parseFrenchDateToSql(apiCatnat.date_publication_jo),
      libelleRisqueJo: apiCatnat.libelle_risque_jo,
      codeInsee: apiCatnat.code_insee,
      libelleCommune: apiCatnat.libelle_commune,
    };
  },

  /**
   * Filtre les catastrophes par date (garde uniquement les X dernières années)
   */
  filterByYears(catnats: ApiGeorisquesCatnat[], years: number = API_GEORISQUES.yearsToFetch): ApiGeorisquesCatnat[] {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

    return catnats.filter((catnat) => {
      const [day, month, year] = catnat.date_debut_evt.split("/").map(Number);
      const catnatDate = new Date(year, month - 1, day);
      return catnatDate >= cutoffDate;
    });
  },

  /**
   * Filtre les catastrophes pour ne garder que celles liées au RGA (sécheresse)
   */
  filterByRGA(catnats: ApiGeorisquesCatnat[]): ApiGeorisquesCatnat[] {
    return catnats.filter((catnat) => {
      const libelle = catnat.libelle_risque_jo.toLowerCase();
      return CATNAT_RGA_TYPES.keywords.some((keyword) => libelle.includes(keyword));
    });
  },

  /**
   * Filtre les catastrophes par date ET par type RGA
   */
  filterForRGA(catnats: ApiGeorisquesCatnat[], years: number = API_GEORISQUES.yearsToFetch): ApiGeorisquesCatnat[] {
    // D'abord filtrer par type RGA (sécheresse)
    const rgaCatnats = this.filterByRGA(catnats);

    // Puis filtrer par date (20 ans)
    return this.filterByYears(rgaCatnats, years);
  },

  /**
   * Importe les catastrophes naturelles pour une commune
   */
  async importForCommune(codeInsee: string): Promise<{
    success: boolean;
    imported: number;
    skipped: number;
    error?: string;
  }> {
    try {
      // Récupérer les catastrophes depuis l'API
      const apiCatnats = await fetchCatnatByCodeInsee(codeInsee);

      if (apiCatnats.length === 0) {
        return { success: true, imported: 0, skipped: 0 };
      }

      // Filtrer par RGA (sécheresse) et par date (20 ans)
      const rgaCatnats = this.filterForRGA(apiCatnats);
      const skipped = apiCatnats.length - rgaCatnats.length;

      if (rgaCatnats.length === 0) {
        return { success: true, imported: 0, skipped };
      }

      // Transformer et insérer en BDD
      const dbCatnats = rgaCatnats.map((catnat) => this.transformApiToDb(catnat));
      await catastrophesNaturellesRepository.batchUpsert(dbCatnats);

      return {
        success: true,
        imported: rgaCatnats.length,
        skipped,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        imported: 0,
        skipped: 0,
        error: errorMessage,
      };
    }
  },

  /**
   * Importe les catastrophes naturelles pour plusieurs communes
   */
  async importForCommunes(codesInsee: string[], onProgress?: CatnatProgressCallback): Promise<CatnatImportStats> {
    const stats: CatnatImportStats = {
      totalCommunes: codesInsee.length,
      communesProcessed: 0,
      communesSuccess: 0,
      communesFailed: 0,
      totalCatnat: 0,
      catnatImported: 0,
      catnatSkipped: 0,
      errors: [],
    };

    if (codesInsee.length === 0) {
      return stats;
    }

    // Diviser en batches de 10 communes max (limite API)
    const batches: string[][] = [];
    for (let i = 0; i < codesInsee.length; i += API_GEORISQUES.limits.maxCodesInsee) {
      batches.push(codesInsee.slice(i, i + API_GEORISQUES.limits.maxCodesInsee));
    }

    // Traiter chaque batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        // Récupérer les catastrophes pour le batch
        const apiCatnats = await fetchCatnatByCodesInsee(batch);
        stats.totalCatnat += apiCatnats.length;

        // Filtrer par RGA (sécheresse) et par date (20 ans)
        const rgaCatnats = this.filterForRGA(apiCatnats);
        stats.catnatSkipped += apiCatnats.length - rgaCatnats.length;

        if (rgaCatnats.length > 0) {
          // Transformer et insérer en BDD
          const dbCatnats = rgaCatnats.map((catnat) => this.transformApiToDb(catnat));
          await catastrophesNaturellesRepository.batchUpsert(dbCatnats);
          stats.catnatImported += rgaCatnats.length;
        }

        // Marquer toutes les communes du batch comme succès
        stats.communesProcessed += batch.length;
        stats.communesSuccess += batch.length;
      } catch (error) {
        // En cas d'erreur sur le batch, marquer toutes les communes comme échec
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        for (const codeInsee of batch) {
          stats.communesFailed++;
          stats.communesProcessed++;
          stats.errors.push({
            codeInsee,
            error: errorMessage,
          });
        }
      }

      // Callback de progression
      if (onProgress) {
        onProgress({
          communesProcessed: stats.communesProcessed,
          communesSuccess: stats.communesSuccess,
          communesFailed: stats.communesFailed,
          catnatImported: stats.catnatImported,
          catnatSkipped: stats.catnatSkipped,
        });
      }

      // Rate limiting entre les batches (sauf pour le dernier)
      if (batchIndex < batches.length - 1) {
        await delay(API_GEORISQUES.delayBetweenCalls);
      }
    }

    return stats;
  },

  /**
   * Compte le nombre de catastrophes naturelles pour une commune
   */
  async countForCommune(codeInsee: string): Promise<number> {
    const catnats = await catastrophesNaturellesRepository.findByCodeInsee(codeInsee);
    return catnats.length;
  },

  /**
   * Récupère les catastrophes naturelles pour une commune
   */
  async getForCommune(codeInsee: string) {
    return catastrophesNaturellesRepository.findByCodeInsee(codeInsee);
  },

  /**
   * Compte le total de catastrophes naturelles pour un département
   */
  async getTotalForDepartement(codeDepartement: string): Promise<number> {
    return catastrophesNaturellesRepository.getTotalByDepartement(codeDepartement);
  },

  /**
   * Récupère les statistiques par type de risque pour une commune
   */
  async getStatsByTypeForCommune(codeInsee: string) {
    return catastrophesNaturellesRepository.getStatsByTypeForCommune(codeInsee);
  },
};
