import { and, eq, inArray, notExists, SQL, sql } from "drizzle-orm";
import { db } from "../client";
import {
  agents,
  entreprisesAmo,
  entreprisesAmoCommunes,
  entreprisesAmoEpci,
  parcoursAmoValidations,
  structures,
} from "../schema";
import type { NewEntrepriseAmo } from "../schema/entreprises-amo";
import { BaseRepository } from "./base.repository";
import { structuresRepository } from "./structures.repository";
import { agentsRepository } from "./agents.repository";
import type { Amo } from "@/features/parcours/amo/domain/entities";
import { parseCodesDepartement } from "@/shared/utils/departements.utils";

/**
 * Repository pour les entreprises AMO
 */
export class EntreprisesAmoRepository extends BaseRepository<Amo> {
  /**
   * Trouve une AMO par ID
   */
  async findById(id: string): Promise<Amo | null> {
    const [amo] = await db.select().from(entreprisesAmo).where(eq(entreprisesAmo.id, id)).limit(1);

    return amo || null;
  }

  /**
   * Récupère toutes les AMO
   */
  async findAll(): Promise<Amo[]> {
    return await db.select().from(entreprisesAmo).orderBy(entreprisesAmo.nom);
  }

  /**
   * Récupère toutes les AMO avec leurs relations (communes et EPCI)
   */
  async findAllWithRelations(): Promise<
    Array<
      Amo & {
        communes: { codeInsee: string }[];
        epci: { codeEpci: string }[];
      }
    >
  > {
    const allAmosWithRelations = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
        codeInsee: entreprisesAmoCommunes.codeInsee,
        codeEpci: entreprisesAmoEpci.codeEpci,
      })
      .from(entreprisesAmo)
      .leftJoin(entreprisesAmoCommunes, eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId))
      .leftJoin(entreprisesAmoEpci, eq(entreprisesAmo.id, entreprisesAmoEpci.entrepriseAmoId))
      .orderBy(entreprisesAmo.nom);

    // Grouper par AMO
    const amosMap = new Map<
      string,
      Amo & {
        communes: { codeInsee: string }[];
        epci: { codeEpci: string }[];
      }
    >();

    for (const row of allAmosWithRelations) {
      if (!amosMap.has(row.id)) {
        amosMap.set(row.id, {
          id: row.id,
          nom: row.nom,
          siret: row.siret,
          departements: row.departements,
          emails: row.emails,
          telephone: row.telephone,
          adresse: row.adresse,
          communes: [],
          epci: [],
        });
      }

      const amo = amosMap.get(row.id)!;

      if (row.codeInsee && !amo.communes.some((c) => c.codeInsee === row.codeInsee)) {
        amo.communes.push({ codeInsee: row.codeInsee });
      }

      if (row.codeEpci && !amo.epci.some((e) => e.codeEpci === row.codeEpci)) {
        amo.epci.push({ codeEpci: row.codeEpci });
      }
    }

    return Array.from(amosMap.values());
  }

  /**
   * Crée une nouvelle AMO
   */
  async create(data: Partial<Amo>): Promise<Amo> {
    return await db.transaction(async (tx) => {
      const insertData: NewEntrepriseAmo = {
        nom: data.nom!,
        siret: data.siret || "",
        departements: data.departements!,
        emails: data.emails!,
        telephone: data.telephone || "",
        adresse: data.adresse || "",
        // Une nouvelle AMO est sa propre structure, sans rôle Aller-vers.
        structureId: await structuresRepository.creer(data.nom!, tx),
      };

      const [created] = await tx.insert(entreprisesAmo).values(insertData).returning();
      return created;
    });
  }

  /**
   * Met à jour une AMO
   */
  async update(id: string, data: Partial<Amo>): Promise<Amo | null> {
    const updateData: Partial<NewEntrepriseAmo> = {};

    if (data.nom !== undefined) updateData.nom = data.nom;
    // Ne pas permettre de mettre à jour le SIRET via cette méthode (clé unique)
    if (data.departements !== undefined) updateData.departements = data.departements;
    if (data.emails !== undefined) updateData.emails = data.emails;
    if (data.telephone !== undefined) updateData.telephone = data.telephone || "";
    if (data.adresse !== undefined) updateData.adresse = data.adresse || "";
    if (data.horaires !== undefined) updateData.horaires = data.horaires;

    const [updated] = await db.update(entreprisesAmo).set(updateData).where(eq(entreprisesAmo.id, id)).returning();

    return updated || null;
  }

  /**
   * Supprime une AMO et toutes ses relations
   */
  async delete(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existante] = await tx
        .select({ structureId: entreprisesAmo.structureId })
        .from(entreprisesAmo)
        .where(eq(entreprisesAmo.id, id))
        .limit(1);
      if (!existante) return false;
      // Verrou exclusif : une autre suppression ou un rattachement d'agent sur la structure attend, puis voit l'état final.
      await structuresRepository.verrouiller(existante.structureId, "exclusif", tx);
      const [relue] = await tx
        .select({ structureId: entreprisesAmo.structureId })
        .from(entreprisesAmo)
        .where(eq(entreprisesAmo.id, id))
        .limit(1);
      if (!relue) return false;
      // Une fusion ou un détachement l'a déplacée avant le verrou : la garde porterait sur la mauvaise structure.
      if (relue.structureId !== existante.structureId) {
        throw new Error("Cette AMO vient de changer de structure : recommencez la suppression");
      }
      const structure = await structuresRepository.findAvecHabilitations(existante.structureId, tx);
      if (!structure?.allersVers && (await agentsRepository.compterParStructure(existante.structureId, tx)) > 0) {
        throw new Error(
          "Des agents perdraient leur seul rôle : rattachez-les à une autre structure avant de supprimer cette AMO"
        );
      }

      // Supprimer les relations communes
      await tx.delete(entreprisesAmoCommunes).where(eq(entreprisesAmoCommunes.entrepriseAmoId, id));

      // Supprimer les relations EPCI
      await tx.delete(entreprisesAmoEpci).where(eq(entreprisesAmoEpci.entrepriseAmoId, id));

      // Supprimer l'AMO
      const result = await tx.delete(entreprisesAmo).where(eq(entreprisesAmo.id, id)).returning();

      await agentsRepository.resynchroniserColonnesHeritees(existante.structureId, tx);
      await structuresRepository.supprimerVides(tx);
      return result.length > 0;
    });
  }

  /**
   * Supprime les entreprises qu'aucun agent ni aucune validation AMO ne référence
   */
  async supprimerNonRattachees(): Promise<{ supprimees: string[]; conservees: string[] }> {
    const sansAgentNiValidation = and(
      notExists(db.select({ id: agents.id }).from(agents).where(eq(agents.structureId, entreprisesAmo.structureId))),
      notExists(
        db
          .select({ id: parcoursAmoValidations.id })
          .from(parcoursAmoValidations)
          .where(eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
      )
    );
    const supprimees = await db.transaction(async (tx) => {
      // Un agent rattaché pendant la purge attend ces verrous ; le DELETE, relu après eux, épargne alors sa structure.
      const verrouillees = await tx
        .select({ id: structures.id })
        .from(structures)
        .innerJoin(entreprisesAmo, eq(entreprisesAmo.structureId, structures.id))
        .where(sansAgentNiValidation)
        .orderBy(structures.id)
        .for("update", { of: structures });
      // Une structure devenue candidate entre-temps n'est pas verrouillée : elle attend la prochaine purge.
      const lignes = verrouillees.length
        ? await tx
            .delete(entreprisesAmo)
            .where(
              and(
                inArray(
                  entreprisesAmo.structureId,
                  verrouillees.map((v) => v.id)
                ),
                sansAgentNiValidation
              )
            )
            .returning({ nom: entreprisesAmo.nom })
        : [];
      await structuresRepository.supprimerVides(tx);
      return lignes;
    });

    const conservees = await db.select({ nom: entreprisesAmo.nom }).from(entreprisesAmo).orderBy(entreprisesAmo.nom);

    return { supprimees: supprimees.map((s) => s.nom), conservees: conservees.map((s) => s.nom) };
  }

  /**
   * Vérifie si une AMO existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: entreprisesAmo.id })
      .from(entreprisesAmo)
      .where(eq(entreprisesAmo.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'AMO
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(entreprisesAmo);

    if (where) {
      query.where(where);
    }

    const [result] = await query;
    return result?.count || 0;
  }

  /**
   * Met à jour les relations communes d'une AMO
   */
  async updateCommunesRelations(amoId: string, codeInsees: string[]): Promise<void> {
    await this.transaction(async (tx) => {
      // Supprimer les anciennes relations
      await tx.delete(entreprisesAmoCommunes).where(eq(entreprisesAmoCommunes.entrepriseAmoId, amoId));

      // Insérer les nouvelles relations si présentes
      if (codeInsees.length > 0) {
        await tx.insert(entreprisesAmoCommunes).values(
          codeInsees.map((codeInsee) => ({
            entrepriseAmoId: amoId,
            codeInsee: codeInsee,
          }))
        );
      }
    });
  }

  /**
   * Met à jour les relations EPCI d'une AMO
   */
  async updateEpciRelations(amoId: string, codeEpcis: string[]): Promise<void> {
    await this.transaction(async (tx) => {
      // Supprimer les anciennes relations
      await tx.delete(entreprisesAmoEpci).where(eq(entreprisesAmoEpci.entrepriseAmoId, amoId));

      // Insérer les nouvelles relations si présentes
      if (codeEpcis.length > 0) {
        await tx.insert(entreprisesAmoEpci).values(
          codeEpcis.map((codeEpci) => ({
            entrepriseAmoId: amoId,
            codeEpci: codeEpci,
          }))
        );
      }
    });
  }

  /**
   * Récupère les codes EPCI assignés à une entreprise AMO
   */
  async getEpcisByEntrepriseAmoId(entrepriseAmoId: string): Promise<string[]> {
    const result = await db
      .select({ codeEpci: entreprisesAmoEpci.codeEpci })
      .from(entreprisesAmoEpci)
      .where(eq(entreprisesAmoEpci.entrepriseAmoId, entrepriseAmoId));

    return result.map((row) => row.codeEpci);
  }

  /**
   * Récupère les codes département couverts par une entreprise AMO
   * Extrait depuis le champ texte `departements` (format "Indre 36, Essonne 91").
   */
  async getDepartementsByEntrepriseAmoId(entrepriseAmoId: string): Promise<string[]> {
    const [row] = await db
      .select({ departements: entreprisesAmo.departements })
      .from(entreprisesAmo)
      .where(eq(entreprisesAmo.id, entrepriseAmoId))
      .limit(1);

    if (!row) return [];

    return parseCodesDepartement(row.departements);
  }
}

// Instance singleton
export const entreprisesAmoRepository = new EntreprisesAmoRepository();
