import { eq, sql, SQL, desc, and, isNull, gt } from "drizzle-orm";
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
   * Trouve un user stub par son claim token (non expiré).
   * Utilisé lors du callback FranceConnect pour rattacher un dossier
   * créé en amont par un agent Aller-vers.
   */
  async findByClaimToken(token: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.claimToken, token),
          isNull(users.fcId),
          isNull(users.claimedAt),
          gt(users.claimTokenExpiresAt, new Date())
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Trouve un user stub non réclamé par email (exact, lowercase).
   * Retourne null si plusieurs stubs correspondent (cas ambigu : on ne rattache pas).
   */
  async findByEmailWithoutFcId(email: string): Promise<User | null> {
    const matches = await db
      .select()
      .from(users)
      .where(and(sql`LOWER(${users.email}) = LOWER(${email})`, isNull(users.fcId)))
      .limit(2);

    if (matches.length !== 1) {
      return null;
    }

    return matches[0];
  }

  /**
   * Crée un user "stub" (sans FranceConnect) destiné à être rattaché
   * plus tard quand le demandeur se connectera via FC.
   */
  async createStub(data: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    claimToken: string;
    claimTokenExpiresAt: Date;
  }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone,
        claimToken: data.claimToken,
        claimTokenExpiresAt: data.claimTokenExpiresAt,
        lastLogin: new Date(),
      })
      .returning();

    return result[0];
  }

  /**
   * Rattache un user stub à un compte FranceConnect.
   * Met le fcId + date de claim, invalide le token.
   */
  async claimStub(userId: string, userInfo: FranceConnectUserInfo): Promise<User> {
    const result = await db
      .update(users)
      .set({
        fcId: userInfo.sub,
        // L'email FC est autoritaire si fourni ; sinon on garde celui saisi par l'AV.
        email: userInfo.email || sql`${users.email}`,
        nom: userInfo.family_name || sql`${users.nom}`,
        prenom: userInfo.given_name || sql`${users.prenom}`,
        claimedAt: new Date(),
        claimToken: null,
        claimTokenExpiresAt: null,
        lastLogin: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      throw new Error("Failed to claim user stub");
    }

    return result[0];
  }

  /**
   * Crée ou met à jour un utilisateur depuis FranceConnect.
   *
   * Ordre de résolution :
   * 1. Si `claimToken` fourni et valide → rattache le stub correspondant.
   * 2. Sinon, user existant avec ce `fcId` → mise à jour.
   * 3. Sinon, stub unique avec le même email → rattachement par email.
   * 4. Sinon, création d'un nouvel utilisateur.
   */
  async upsertFromFranceConnect(userInfo: FranceConnectUserInfo, opts?: { claimToken?: string }): Promise<User> {
    const fcId = userInfo.sub;

    // 1. Rattachement explicite via claim token
    if (opts?.claimToken) {
      const stub = await this.findByClaimToken(opts.claimToken);
      if (stub) {
        return await this.claimStub(stub.id, userInfo);
      }
      // Token invalide/expiré : on continue avec le flux normal.
    }

    // 2. User déjà rattaché à ce fcId
    const existingUser = await this.findByFcId(fcId);
    if (existingUser) {
      const updates: Partial<NewUser> = {
        lastLogin: new Date(),
        email: userInfo.email || existingUser.email,
        nom: userInfo.family_name || existingUser.nom,
        prenom: userInfo.given_name || existingUser.prenom,
      };

      const updated = await this.update(existingUser.id, updates);

      if (!updated) {
        throw new Error("Failed to update user last login");
      }

      return updated;
    }

    // 3. Fallback : stub unique avec le même email
    if (userInfo.email) {
      const stubByEmail = await this.findByEmailWithoutFcId(userInfo.email);
      if (stubByEmail) {
        return await this.claimStub(stubByEmail.id, userInfo);
      }
    }

    // 4. Nouvel utilisateur
    return await this.create({
      fcId,
      email: userInfo.email,
      nom: userInfo.family_name,
      prenom: userInfo.given_name,
      lastLogin: new Date(),
    });
  }

  /**
   * Met à jour les coordonnées de contact
   */
  async updateContactInfo(id: string, data: { emailContact?: string; telephone?: string }): Promise<User | null> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();

    return result[0] || null;
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
