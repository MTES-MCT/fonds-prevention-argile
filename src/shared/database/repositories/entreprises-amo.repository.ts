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
import { structuresRepository, type StructuresExecutor } from "./structures.repository";
import { agentsRepository } from "./agents.repository";
import type { Amo } from "@/features/parcours/amo/domain/entities";
import { parseCodesDepartement } from "@/shared/utils/departements.utils";

/** Ce que porte l'habilitation AMO en propre : son territoire et l'équipe qui reçoit les demandes. */
export interface HabilitationAmoAEnregistrer {
  departements: string;
  emails: string;
}

/**
 * Repository pour les entreprises AMO
 */
export class EntreprisesAmoRepository {
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

  /** Ajoute l'habilitation AMO à une structure, qui doit avoir un SIRET : la ligne reprend son identité. */
  async ajouter(
    structureId: string,
    habilitation: HabilitationAmoAEnregistrer,
    executor: StructuresExecutor
  ): Promise<string> {
    const identite = await structuresRepository.findIdentite(structureId, executor);
    if (!identite) throw new Error("Structure introuvable");
    if (!identite.siret) throw new Error("Renseignez le SIRET de la structure avant de lui ajouter l'habilitation AMO");
    const [creee] = await executor
      .insert(entreprisesAmo)
      .values({
        nom: identite.nom,
        siret: identite.siret,
        adresse: identite.adresse,
        telephone: identite.telephone,
        horaires: identite.horaires,
        departements: habilitation.departements,
        emails: habilitation.emails,
        structureId,
      })
      .returning({ id: entreprisesAmo.id });
    return creee.id;
  }

  /** Territoire et équipe seulement : l'identité se modifie sur la structure. */
  async mettreAJourHabilitation(
    id: string,
    habilitation: HabilitationAmoAEnregistrer,
    executor: StructuresExecutor = db
  ): Promise<boolean> {
    const lignes = await executor
      .update(entreprisesAmo)
      .set({ departements: habilitation.departements, emails: habilitation.emails, updatedAt: new Date() })
      .where(eq(entreprisesAmo.id, id))
      .returning({ id: entreprisesAmo.id });
    return lignes.length > 0;
  }

  /** Avec la structure qui la porte : l'appelant a vérifié qu'aucun agent ni aucun dossier n'en dépend. */
  async supprimerAvecStructure(id: string, executor: StructuresExecutor): Promise<void> {
    await executor.delete(entreprisesAmoCommunes).where(eq(entreprisesAmoCommunes.entrepriseAmoId, id));
    await executor.delete(entreprisesAmoEpci).where(eq(entreprisesAmoEpci.entrepriseAmoId, id));
    await executor.delete(entreprisesAmo).where(eq(entreprisesAmo.id, id));
  }

  /** Retire l'habilitation AMO d'une structure qui en garde une autre. */
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
      const structure = await structuresRepository.findAvecHabilitations(existante.structureId, tx);
      if (!structure?.allersVers && (await agentsRepository.compterParStructure(existante.structureId, tx)) > 0) {
        throw new Error(
          "Des agents perdraient leur seul rôle : rattachez-les à une autre structure avant de retirer l'habilitation AMO"
        );
      }

      await tx.delete(entreprisesAmoCommunes).where(eq(entreprisesAmoCommunes.entrepriseAmoId, id));
      await tx.delete(entreprisesAmoEpci).where(eq(entreprisesAmoEpci.entrepriseAmoId, id));
      const result = await tx.delete(entreprisesAmo).where(eq(entreprisesAmo.id, id)).returning();

      await agentsRepository.resynchroniserColonnesHeritees(existante.structureId, tx);
      return result.length > 0;
    });
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
  async updateCommunesRelations(amoId: string, codeInsees: string[], tx: StructuresExecutor = db): Promise<void> {
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
  }

  /**
   * Met à jour les relations EPCI d'une AMO
   */
  async updateEpciRelations(amoId: string, codeEpcis: string[], tx: StructuresExecutor = db): Promise<void> {
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
  }

  async findHabilitationParStructure(
    structureId: string,
    executor: StructuresExecutor = db
  ): Promise<{ id: string; departements: string; emails: string } | null> {
    const [ligne] = await executor
      .select({ id: entreprisesAmo.id, departements: entreprisesAmo.departements, emails: entreprisesAmo.emails })
      .from(entreprisesAmo)
      .where(eq(entreprisesAmo.structureId, structureId));
    return ligne ?? null;
  }

  async getCommunesByEntrepriseAmoId(entrepriseAmoId: string): Promise<string[]> {
    const lignes = await db
      .select({ codeInsee: entreprisesAmoCommunes.codeInsee })
      .from(entreprisesAmoCommunes)
      .where(eq(entreprisesAmoCommunes.entrepriseAmoId, entrepriseAmoId));
    return lignes.map((ligne) => ligne.codeInsee);
  }

  /** Validations qui pointent l'AMO : la clé étrangère interdit alors de retirer son habilitation. */
  async compterValidations(entrepriseAmoId: string): Promise<number> {
    const [resultat] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(parcoursAmoValidations)
      .where(eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId));
    return resultat?.count ?? 0;
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
