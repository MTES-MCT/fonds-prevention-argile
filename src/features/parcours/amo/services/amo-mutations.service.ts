import { entreprisesAmoRepository } from "@/shared/database/repositories/entreprises-amo.repository";
import type { Amo } from "../domain/entities";
import { parseListe } from "@/shared/utils/liste.utils";

/**
 * Service pour les opérations d'écriture sur les AMO
 */

export interface UpdateAmoData {
  nom: string;
  siret?: string;
  departements: string;
  emails: string;
  telephone?: string;
  adresse?: string;
  horaires?: string | null;
  communes?: string[];
  epci?: string[];
}

/**
 * Met à jour une AMO avec ses relations
 */
export async function updateAmo(amoId: string, data: UpdateAmoData): Promise<Amo> {
  // Valider les données
  if (!data.nom.trim()) {
    throw new Error("Le nom est obligatoire");
  }

  // Mettre à jour l'AMO
  const updated = await entreprisesAmoRepository.update(amoId, {
    nom: data.nom.trim(),
    siret: data.siret?.trim() || "",
    departements: parseListe(data.departements).join(", "),
    // Stockage canonique en `;` : les lecteurs (email AMO, préremplissage DN) découpent sur ce séparateur
    emails: parseListe(data.emails).join(";"),
    telephone: data.telephone?.trim() || "",
    adresse: data.adresse?.trim() || "",
    horaires: data.horaires === undefined ? undefined : data.horaires?.trim() || null,
  });

  if (!updated) {
    throw new Error(`AMO ${amoId} non trouvée`);
  }

  // Mettre à jour les relations communes si fournies
  if (data.communes !== undefined) {
    await entreprisesAmoRepository.updateCommunesRelations(amoId, data.communes);
  }

  // Mettre à jour les relations EPCI si fournies
  if (data.epci !== undefined) {
    await entreprisesAmoRepository.updateEpciRelations(amoId, data.epci);
  }

  return updated;
}

/**
 * Supprime une AMO
 */
export async function deleteAmo(amoId: string): Promise<void> {
  const deleted = await entreprisesAmoRepository.delete(amoId);

  if (!deleted) {
    throw new Error(`AMO ${amoId} non trouvée`);
  }
}
