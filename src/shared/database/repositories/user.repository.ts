import { eq, sql, SQL, desc } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema/users";
import { BaseRepository } from "./base.repository";
import type { User, NewUser } from "../schema/users";
import { FranceConnectUserInfo } from "@/features/auth";

export class UserRepository extends BaseRepository<User> {
  /**
   * Trouve un utilisateur par ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

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
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();

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
    const result = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'utilisateurs
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(users);

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
    const result = await db.select().from(users).where(eq(users.fcId, fcId)).limit(1);

    return result[0] || null;
  }

  /**
   * Crée ou met à jour un utilisateur depuis FranceConnect
   */
  async upsertFromFranceConnect(userInfo: FranceConnectUserInfo): Promise<User> {
    const fcId = userInfo.sub;

    // Recherche de l'utilisateur existant
    const existingUser = await this.findByFcId(fcId);

    if (existingUser) {
      //  Mise à jour : lastLogin + codeInsee si fourni et pas déjà présent
      const updates: Partial<NewUser> = {
        lastLogin: new Date(),
        email: userInfo.email || existingUser.email, // Met à jour l'email si fourni
        nom: userInfo.family_name || existingUser.nom,
        prenom: userInfo.given_name || existingUser.prenom,
      };

      const updated = await this.update(existingUser.id, updates);

      if (!updated) {
        throw new Error("Failed to update user last login");
      }

      return updated;
    } else {
      // Création d'un nouvel utilisateur
      return await this.create({
        fcId,
        email: userInfo.email,
        nom: userInfo.family_name,
        prenom: userInfo.given_name,
        lastLogin: new Date(),
      });
    }
  }

  /**
   * Met à jour la date de dernière connexion
   */
  async updateLastLogin(id: string): Promise<User | null> {
    const result = await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id)).returning();

    return result[0] || null;
  }

  /**
   * Met à jour la date de dernière connexion par FranceConnect ID
   */
  async updateLastLoginByFcId(fcId: string): Promise<User | null> {
    const result = await db.update(users).set({ lastLogin: new Date() }).where(eq(users.fcId, fcId)).returning();

    return result[0] || null;
  }
}

// Export d'une instance singleton
export const userRepository = new UserRepository();
