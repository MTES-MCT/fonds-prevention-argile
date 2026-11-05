import { and, asc, eq, notExists } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "../client";
import { structures } from "../schema/structures";
import { entreprisesAmo } from "../schema/entreprises-amo";
import { allersVers } from "../schema/allers-vers";
import { agents } from "../schema/agents";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StructuresExecutor = typeof db | PgTransaction<any, any, any>;

/** Lignes d'habilitation d'une structure : leur présence fait ses rôles. */
export interface HabilitationsLignes {
  entrepriseAmo: { id: string; nom: string } | null;
  allersVers: { id: string; nom: string } | null;
}

export interface StructureAvecHabilitations extends HabilitationsLignes {
  id: string;
  nom: string;
}

export class StructuresRepository {
  async creer(nom: string, executor: StructuresExecutor = db): Promise<string> {
    const [creee] = await executor.insert(structures).values({ nom }).returning({ id: structures.id });
    return creee.id;
  }

  async supprimer(structureId: string, executor: StructuresExecutor = db): Promise<void> {
    await executor.delete(structures).where(eq(structures.id, structureId));
  }

  async renommer(structureId: string, nom: string): Promise<boolean> {
    const renommees = await db
      .update(structures)
      .set({ nom, updatedAt: new Date() })
      .where(eq(structures.id, structureId))
      .returning({ id: structures.id });
    return renommees.length > 0;
  }

  /** Fait passer une ligne d'habilitation dans une autre structure, qui ne doit pas en avoir du même type. */
  async rattacherLigne(
    type: "amo" | "allersVers",
    ligneId: string,
    structureId: string,
    executor: StructuresExecutor
  ): Promise<void> {
    if (type === "amo") {
      await executor.update(entreprisesAmo).set({ structureId }).where(eq(entreprisesAmo.id, ligneId));
    } else {
      await executor.update(allersVers).set({ structureId }).where(eq(allersVers.id, ligneId));
    }
  }

  /** Dans une transaction : exclusif pour retirer une habilitation, partagé pour y rattacher un agent. */
  async verrouiller(structureId: string, mode: "exclusif" | "partage", executor: StructuresExecutor): Promise<void> {
    await executor
      .select({ id: structures.id })
      .from(structures)
      .where(eq(structures.id, structureId))
      .for(mode === "exclusif" ? "update" : "share");
  }

  /** Null si la structure n'existe pas. */
  async findAvecHabilitations(
    structureId: string,
    executor: StructuresExecutor = db
  ): Promise<StructureAvecHabilitations | null> {
    const [ligne] = await this.selectAvecHabilitations(executor).where(eq(structures.id, structureId));
    return ligne ? versStructure(ligne) : null;
  }

  async findAllAvecHabilitations(): Promise<StructureAvecHabilitations[]> {
    const lignes = await this.selectAvecHabilitations(db).orderBy(asc(structures.nom));
    return lignes.map(versStructure);
  }

  /** Supprime les structures sans habilitation ni agent, laissées par une purge ou une suppression. */
  async supprimerVides(executor: StructuresExecutor = db): Promise<number> {
    const supprimees = await executor
      .delete(structures)
      .where(
        and(
          notExists(
            executor
              .select({ id: entreprisesAmo.id })
              .from(entreprisesAmo)
              .where(eq(entreprisesAmo.structureId, structures.id))
          ),
          notExists(
            executor.select({ id: allersVers.id }).from(allersVers).where(eq(allersVers.structureId, structures.id))
          ),
          notExists(executor.select({ id: agents.id }).from(agents).where(eq(agents.structureId, structures.id)))
        )
      )
      .returning({ id: structures.id });
    return supprimees.length;
  }

  private selectAvecHabilitations(executor: StructuresExecutor) {
    return executor
      .select({
        id: structures.id,
        nom: structures.nom,
        amoId: entreprisesAmo.id,
        amoNom: entreprisesAmo.nom,
        avId: allersVers.id,
        avNom: allersVers.nom,
      })
      .from(structures)
      .leftJoin(entreprisesAmo, eq(entreprisesAmo.structureId, structures.id))
      .leftJoin(allersVers, eq(allersVers.structureId, structures.id));
  }
}

function versStructure(ligne: {
  id: string;
  nom: string;
  amoId: string | null;
  amoNom: string | null;
  avId: string | null;
  avNom: string | null;
}): StructureAvecHabilitations {
  return {
    id: ligne.id,
    nom: ligne.nom,
    entrepriseAmo: ligne.amoId && ligne.amoNom ? { id: ligne.amoId, nom: ligne.amoNom } : null,
    allersVers: ligne.avId && ligne.avNom ? { id: ligne.avId, nom: ligne.avNom } : null,
  };
}

export const structuresRepository = new StructuresRepository();
