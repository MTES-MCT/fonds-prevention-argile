import { eq, inArray, isNull, SQL, sql } from "drizzle-orm";
import { db } from "../client";
import { allersVers, allersVersDepartements, allersVersEpci, structures } from "../schema";
import { structuresRepository, type StructuresExecutor } from "./structures.repository";
import { agentsRepository } from "./agents.repository";
import { variantesCodeDepartement } from "@/shared/constants/departements.constants";

/** Structure Aller-vers telle que l'annuaire la montre, sans sa structure de rattachement. */
export type AllersVersAnnuaire = Omit<typeof allersVers.$inferSelect, "structureId">;

export type AllersVersWithRelations = {
  id: string;
  nom: string;
  emails: string[];
  telephone: string;
  adresse: string;
  horaires: string | null;
  libelleZone: string | null;
  departements: { codeDepartement: string }[];
  epci: { codeEpci: string }[];
};

/**
 * Repository pour les structures "Allers Vers"
 */
export class AllersVersRepository {
  /**
   * Trouve un Allers Vers par ID
   */
  async findById(id: string): Promise<typeof allersVers.$inferSelect | null> {
    const [av] = await db.select().from(allersVers).where(eq(allersVers.id, id)).limit(1);

    return av || null;
  }

  /**
   * Récupère tous les Allers Vers
   */
  async findAll(): Promise<Array<typeof allersVers.$inferSelect>> {
    return await db.select().from(allersVers).orderBy(allersVers.nom);
  }

  /**
   * Récupère tous les Allers Vers avec leurs relations (départements et EPCI)
   */
  async findAllWithRelations(): Promise<AllersVersWithRelations[]> {
    const allAvWithRelations = await db
      .select({
        id: allersVers.id,
        nom: allersVers.nom,
        emails: allersVers.emails,
        telephone: allersVers.telephone,
        adresse: allersVers.adresse,
        horaires: allersVers.horaires,
        libelleZone: allersVers.libelleZone,
        codeDepartement: allersVersDepartements.codeDepartement,
        codeEpci: allersVersEpci.codeEpci,
      })
      .from(allersVers)
      .leftJoin(allersVersDepartements, eq(allersVers.id, allersVersDepartements.allersVersId))
      .leftJoin(allersVersEpci, eq(allersVers.id, allersVersEpci.allersVersId))
      .orderBy(allersVers.nom);

    // Grouper par Allers Vers
    const avMap = new Map<string, AllersVersWithRelations>();

    for (const row of allAvWithRelations) {
      if (!avMap.has(row.id)) {
        avMap.set(row.id, {
          id: row.id,
          nom: row.nom,
          emails: row.emails,
          telephone: row.telephone,
          adresse: row.adresse,
          horaires: row.horaires,
          libelleZone: row.libelleZone,
          departements: [],
          epci: [],
        });
      }

      const av = avMap.get(row.id)!;

      if (row.codeDepartement && !av.departements.some((d) => d.codeDepartement === row.codeDepartement)) {
        av.departements.push({ codeDepartement: row.codeDepartement });
      }

      if (row.codeEpci && !av.epci.some((e) => e.codeEpci === row.codeEpci)) {
        av.epci.push({ codeEpci: row.codeEpci });
      }
    }

    return Array.from(avMap.values());
  }

  /** Aller-vers dont la structure n'a pas encore de SIRET : un import les rapproche par leur nom. */
  async findSansSiretPourRapprochement(): Promise<
    { id: string; nom: string; structureId: string; departements: string[] }[]
  > {
    const lignes = await db
      .select({ id: allersVers.id, nom: allersVers.nom, structureId: allersVers.structureId })
      .from(allersVers)
      .innerJoin(structures, eq(structures.id, allersVers.structureId))
      .where(isNull(structures.siret));
    if (lignes.length === 0) return [];
    const departements = await db
      .select({ id: allersVersDepartements.allersVersId, code: allersVersDepartements.codeDepartement })
      .from(allersVersDepartements)
      .where(
        inArray(
          allersVersDepartements.allersVersId,
          lignes.map((ligne) => ligne.id)
        )
      );
    return lignes.map((ligne) => ({
      ...ligne,
      departements: departements.filter((d) => d.id === ligne.id).map((d) => d.code),
    }));
  }

  async findHabilitationParStructure(
    structureId: string,
    executor: StructuresExecutor = db
  ): Promise<{ id: string; emails: string[]; libelleZone: string | null } | null> {
    const [ligne] = await executor
      .select({ id: allersVers.id, emails: allersVers.emails, libelleZone: allersVers.libelleZone })
      .from(allersVers)
      .where(eq(allersVers.structureId, structureId));
    return ligne ?? null;
  }

  async findStructureId(id: string, executor: StructuresExecutor = db): Promise<string | null> {
    const [ligne] = await executor
      .select({ structureId: allersVers.structureId })
      .from(allersVers)
      .where(eq(allersVers.id, id));
    return ligne?.structureId ?? null;
  }

  /** Ajoute l'habilitation Aller-vers à une structure : la ligne reprend son identité. */
  async ajouter(
    structureId: string,
    emails: string[],
    executor: StructuresExecutor,
    libelleZone: string | null = null
  ): Promise<string> {
    const identite = await structuresRepository.findIdentite(structureId, executor);
    if (!identite) throw new Error("Structure introuvable");
    const [cree] = await executor
      .insert(allersVers)
      .values({
        nom: identite.nom,
        adresse: identite.adresse,
        telephone: identite.telephone,
        horaires: identite.horaires,
        emails,
        libelleZone,
        structureId,
      })
      .returning({ id: allersVers.id });
    return cree.id;
  }

  /** L'équipe seulement : l'identité se modifie sur la structure, le territoire par ses relations. */
  /** Saisie de la fiche ; l'import, qui ne connaît pas la zone, passe par `mettreAJourEmails`. */
  async mettreAJourHabilitation(
    id: string,
    saisie: { emails: string[]; libelleZone: string | null },
    executor: StructuresExecutor
  ): Promise<void> {
    await executor
      .update(allersVers)
      .set({ emails: saisie.emails, libelleZone: saisie.libelleZone })
      .where(eq(allersVers.id, id));
  }

  async mettreAJourEmails(id: string, emails: string[], executor: StructuresExecutor = db): Promise<boolean> {
    const lignes = await executor
      .update(allersVers)
      .set({ emails })
      .where(eq(allersVers.id, id))
      .returning({ id: allersVers.id });
    return lignes.length > 0;
  }

  /** Avec la structure qui la porte : l'appelant a vérifié qu'aucun agent n'en dépend. */
  async supprimerAvecStructure(id: string, executor: StructuresExecutor): Promise<void> {
    await executor.delete(allersVersDepartements).where(eq(allersVersDepartements.allersVersId, id));
    await executor.delete(allersVersEpci).where(eq(allersVersEpci.allersVersId, id));
    await executor.delete(allersVers).where(eq(allersVers.id, id));
  }

  /** Retire l'habilitation Aller-vers d'une structure qui en garde une autre. */
  async delete(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existant] = await tx
        .select({ structureId: allersVers.structureId })
        .from(allersVers)
        .where(eq(allersVers.id, id))
        .limit(1);
      if (!existant) return false;
      // Verrou exclusif : une autre suppression ou un rattachement d'agent sur la structure attend, puis voit l'état final.
      await structuresRepository.verrouiller(existant.structureId, "exclusif", tx);
      const structure = await structuresRepository.findAvecHabilitations(existant.structureId, tx);
      if (!structure?.entrepriseAmo && (await agentsRepository.compterParStructure(existant.structureId, tx)) > 0) {
        throw new Error(
          "Des agents perdraient leur seul rôle : rattachez-les à une autre structure avant de retirer l'habilitation Aller-vers"
        );
      }

      await tx.delete(allersVersDepartements).where(eq(allersVersDepartements.allersVersId, id));
      await tx.delete(allersVersEpci).where(eq(allersVersEpci.allersVersId, id));
      const result = await tx.delete(allersVers).where(eq(allersVers.id, id)).returning();

      await agentsRepository.resynchroniserColonnesHeritees(existant.structureId, tx);
      return result.length > 0;
    });
  }

  /**
   * Vérifie si un Allers Vers existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db.select({ id: allersVers.id }).from(allersVers).where(eq(allersVers.id, id)).limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre d'Allers Vers
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(allersVers);

    if (where) {
      query.where(where);
    }

    const [result] = await query;
    return result?.count || 0;
  }

  /**
   * Met à jour les relations départements d'un Allers Vers
   */
  async updateDepartementsRelations(
    avId: string,
    codeDepartements: string[],
    tx: StructuresExecutor = db
  ): Promise<void> {
    // Supprimer les anciennes relations
    await tx.delete(allersVersDepartements).where(eq(allersVersDepartements.allersVersId, avId));

    // Insérer les nouvelles relations si présentes
    if (codeDepartements.length > 0) {
      await tx.insert(allersVersDepartements).values(
        codeDepartements.map((codeDepartement) => ({
          allersVersId: avId,
          codeDepartement: codeDepartement,
        }))
      );
    }
  }

  /**
   * Met à jour les relations EPCI d'un Allers Vers
   */
  async updateEpciRelations(avId: string, codeEpcis: string[], tx: StructuresExecutor = db): Promise<void> {
    // Supprimer les anciennes relations
    await tx.delete(allersVersEpci).where(eq(allersVersEpci.allersVersId, avId));

    // Insérer les nouvelles relations si présentes
    if (codeEpcis.length > 0) {
      await tx.insert(allersVersEpci).values(
        codeEpcis.map((codeEpci) => ({
          allersVersId: avId,
          codeEpci: codeEpci,
        }))
      );
    }
  }

  /**
   * Récupère les codes départements assignés à un Allers Vers
   */
  async getDepartementsByAllersVersId(allersVersId: string): Promise<string[]> {
    const result = await db
      .select({ codeDepartement: allersVersDepartements.codeDepartement })
      .from(allersVersDepartements)
      .where(eq(allersVersDepartements.allersVersId, allersVersId));

    return result.map((row) => row.codeDepartement);
  }

  /**
   * Récupère les codes EPCI assignés à un Allers Vers
   */
  async getEpcisByAllersVersId(allersVersId: string): Promise<string[]> {
    const result = await db
      .select({ codeEpci: allersVersEpci.codeEpci })
      .from(allersVersEpci)
      .where(eq(allersVersEpci.allersVersId, allersVersId));

    return result.map((row) => row.codeEpci);
  }

  /**
   * Récupère les Allers Vers qui couvrent un département
   */
  async findByDepartement(codeDepartement: string): Promise<AllersVersAnnuaire[]> {
    return await db
      .selectDistinct({
        id: allersVers.id,
        nom: allersVers.nom,
        emails: allersVers.emails,
        telephone: allersVers.telephone,
        adresse: allersVers.adresse,
        horaires: allersVers.horaires,
        libelleZone: allersVers.libelleZone,
      })
      .from(allersVers)
      .innerJoin(allersVersDepartements, eq(allersVers.id, allersVersDepartements.allersVersId))
      .where(inArray(allersVersDepartements.codeDepartement, variantesCodeDepartement(codeDepartement)))
      .orderBy(allersVers.nom);
  }

  /**
   * Récupère les Allers Vers qui couvrent un EPCI
   */
  async findByEpci(codeEpci: string): Promise<AllersVersAnnuaire[]> {
    return await db
      .selectDistinct({
        id: allersVers.id,
        nom: allersVers.nom,
        emails: allersVers.emails,
        telephone: allersVers.telephone,
        adresse: allersVers.adresse,
        horaires: allersVers.horaires,
        libelleZone: allersVers.libelleZone,
      })
      .from(allersVers)
      .innerJoin(allersVersEpci, eq(allersVers.id, allersVersEpci.allersVersId))
      .where(eq(allersVersEpci.codeEpci, codeEpci))
      .orderBy(allersVers.nom);
  }

  /**
   * Récupère les Allers Vers avec priorité EPCI, fallback département
   *
   * Logique :
   * 1. Si l'EPCI est fourni et a des AV → retourne uniquement ceux de l'EPCI
   * 2. Sinon → retourne les AV du département
   * 3. Si aucun → retourne un tableau vide
   */
  async findByEpciWithDepartementFallback(codeDepartement: string, codeEpci?: string): Promise<AllersVersAnnuaire[]> {
    // 1. Si EPCI fourni, chercher d'abord par EPCI
    if (codeEpci) {
      const avParEpci = await this.findByEpci(codeEpci);
      if (avParEpci.length > 0) {
        return avParEpci; // Priorité EPCI
      }
    }

    // 2. Fallback département
    return await this.findByDepartement(codeDepartement);
  }
}

// Instance singleton
export const allersVersRepository = new AllersVersRepository();
