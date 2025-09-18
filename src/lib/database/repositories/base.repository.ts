import { and, SQL } from "drizzle-orm";
import { db } from "../client";

// Types pour la pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Repository de base avec les opérations CRUD communes
 * Version simplifiée pour MVP
 */
export abstract class BaseRepository<T> {
  /**
   * Trouve un enregistrement par ID
   */
  abstract findById(id: string): Promise<T | null>;

  /**
   * Récupère tous les enregistrements
   */
  abstract findAll(): Promise<T[]>;

  /**
   * Crée un nouvel enregistrement
   */
  abstract create(data: Partial<T>): Promise<T>;

  /**
   * Met à jour un enregistrement
   */
  abstract update(id: string, data: Partial<T>): Promise<T | null>;

  /**
   * Supprime un enregistrement
   */
  abstract delete(id: string): Promise<boolean>;

  /**
   * Vérifie si un enregistrement existe
   */
  abstract exists(id: string): Promise<boolean>;

  /**
   * Compte le nombre d'enregistrements
   */
  abstract count(where?: SQL): Promise<number>;

  /**
   * Exécute une transaction
   */
  protected async transaction<R>(
    callback: (tx: typeof db) => Promise<R>
  ): Promise<R> {
    return await callback(db);
  }

  /**
   * Helper pour créer des conditions avec opérateur AND
   */
  protected createAndConditions(
    ...conditions: (SQL | undefined)[]
  ): SQL | undefined {
    const validConditions = conditions.filter((c): c is SQL => c !== undefined);
    if (validConditions.length === 0) return undefined;
    if (validConditions.length === 1) return validConditions[0];
    return and(...validConditions);
  }
}
