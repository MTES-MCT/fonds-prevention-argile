import { eq, sql, SQL, desc } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema/users";
import {
  BaseRepository,
  PaginationParams,
  PaginationResult,
} from "./base.repository";
import type { User, NewUser } from "../schema/users";

export class UserRepository extends BaseRepository<User> {
  /**
   * Trouve un utilisateur par ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Récupère tous les utilisateurs
   */
  async findAll(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  /**
   * Crée un nouvel utilisateur
   */
  async create(data: NewUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        ...data,
        lastLogin: new Date(),
      })
      .returning();

    return result[0];
  }

  /**
   * Met à jour un utilisateur
   */
  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Supprime un utilisateur
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();

    return result.length > 0;
  }

  /**
   * Vérifie si un utilisateur existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Vérifie si un utilisateur existe par FranceConnect ID
   */
  async existsByFcId(fcId: string): Promise<boolean> {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.fcId, fcId))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'utilisateurs
   */
  async count(where?: SQL): Promise<number> {
    const query = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * Trouve un utilisateur par FranceConnect ID
   */
  async findByFcId(fcId: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.fcId, fcId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Crée ou met à jour un utilisateur depuis FranceConnect
   */
  async upsertFromFranceConnect(
    userInfo: FranceConnectUserInfo,
    codeInsee?: string // 🆕 Nouveau paramètre optionnel
  ): Promise<User> {
    const fcId = userInfo.sub;

    // Recherche de l'utilisateur existant
    const existingUser = await this.findByFcId(fcId);

    if (existingUser) {
      //  Mise à jour : lastLogin + codeInsee si fourni et pas déjà présent
      const updates: Partial<NewUser> = {
        lastLogin: new Date(),
      };

      // Mettre à jour le code INSEE seulement s'il est fourni et que l'user n'en a pas encore
      if (codeInsee && !existingUser.codeInsee) {
        updates.codeInsee = codeInsee;
      }

      const updated = await this.update(existingUser.id, updates);

      if (!updated) {
        throw new Error("Failed to update user last login");
      }

      return updated;
    } else {
      // Création d'un nouvel utilisateur
      return await this.create({
        fcId,
        codeInsee,
        lastLogin: new Date(),
      });
    }
  }

  /**
   * Met à jour la date de dernière connexion
   */
  async updateLastLogin(id: string): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Met à jour la date de dernière connexion par FranceConnect ID
   */
  async updateLastLoginByFcId(fcId: string): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.fcId, fcId))
      .returning();

    return result[0] || null;
  }

  /**
   * Récupère les utilisateurs avec pagination
   */
  async findWithPagination(
    params: PaginationParams = {}
  ): Promise<PaginationResult<User>> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    // Récupération des données
    const data = await db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));

    // Comptage total
    const total = await this.count();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// Export d'une instance singleton
export const userRepository = new UserRepository();
