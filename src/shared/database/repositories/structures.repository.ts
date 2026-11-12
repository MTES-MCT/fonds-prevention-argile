import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { TypeStructure } from "@/shared/domain/value-objects/type-structure.enum";
import { db } from "../client";
import { structures } from "../schema/structures";
import { entreprisesAmo } from "../schema/entreprises-amo";
import { allersVers } from "../schema/allers-vers";
import { agents } from "../schema/agents";
import { experts, expertsDepartements } from "../schema/experts";
import { allersVersDepartements } from "../schema/allers-vers-departements";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StructuresExecutor = typeof db | PgTransaction<any, any, any>;

/** Lignes d'habilitation d'une structure : AMO et Aller-vers font ses rôles, expert n'en donne aucun. */
export interface HabilitationsLignes {
  entrepriseAmo: { id: string; nom: string } | null;
  allersVers: { id: string; nom: string } | null;
  expert: { id: string; nom: string } | null;
}

export interface StructureAvecHabilitations extends HabilitationsLignes {
  id: string;
  type: TypeStructure;
  nom: string;
}

/** Identité d'une structure, recopiée sur chacune de ses lignes d'habilitation. */
export interface IdentiteStructure {
  nom: string;
  siret: string | null;
  adresse: string;
  telephone: string;
  horaires: string | null;
}

/** Une structure telle que la liste de l'administration la montre, territoires bruts compris. */
export interface StructurePourListe {
  id: string;
  type: TypeStructure;
  nom: string;
  siret: string | null;
  amoDepartements: string | null;
  allersVersDepartements: string[];
  aAllersVers: boolean;
  expertDepartements: string[];
  aExpert: boolean;
  expertDesactive: boolean;
  agentsActifs: number;
}

export class StructuresRepository {
  async creer(identite: IdentiteStructure, type: TypeStructure, executor: StructuresExecutor = db): Promise<string> {
    const [creee] = await executor
      .insert(structures)
      .values({ ...identite, type })
      .returning({ id: structures.id });
    return creee.id;
  }

  async supprimer(structureId: string, executor: StructuresExecutor = db): Promise<void> {
    await executor.delete(structures).where(eq(structures.id, structureId));
  }

  async findIdentite(structureId: string, executor: StructuresExecutor = db): Promise<IdentiteStructure | null> {
    const [ligne] = await executor
      .select({
        nom: structures.nom,
        siret: structures.siret,
        adresse: structures.adresse,
        telephone: structures.telephone,
        horaires: structures.horaires,
      })
      .from(structures)
      .where(eq(structures.id, structureId));
    return ligne ?? null;
  }

  /** Un même SIRET peut porter une structure d'accompagnement et une structure expert. */
  async findIdBySiret(siret: string, type: TypeStructure, executor: StructuresExecutor = db): Promise<string | null> {
    const [ligne] = await executor
      .select({ id: structures.id })
      .from(structures)
      .where(and(eq(structures.siret, siret), eq(structures.type, type)));
    return ligne?.id ?? null;
  }

  /** Seule écriture de l'identité : la structure, puis la copie sur chacune de ses lignes d'habilitation. */
  async mettreAJourIdentite(
    structureId: string,
    identite: IdentiteStructure,
    executor: StructuresExecutor
  ): Promise<void> {
    await executor
      .update(structures)
      .set({ ...identite, updatedAt: new Date() })
      .where(eq(structures.id, structureId));
    await this.propagerIdentite(structureId, executor);
  }

  /** Recopie l'identité de la structure sur ses lignes, que les lecteurs historiques lisent encore. */
  async propagerIdentite(structureId: string, executor: StructuresExecutor): Promise<void> {
    const identite = await this.findIdentite(structureId, executor);
    if (!identite) return;
    const { nom, siret, adresse, telephone, horaires } = identite;
    await executor
      .update(entreprisesAmo)
      .set({ nom, adresse, telephone, horaires, ...(siret ? { siret } : {}) })
      .where(eq(entreprisesAmo.structureId, structureId));
    await executor
      .update(allersVers)
      .set({ nom, adresse, telephone, horaires })
      .where(eq(allersVers.structureId, structureId));
    await executor
      .update(experts)
      .set({ nom, ...(siret ? { siret } : {}), updatedAt: new Date() })
      .where(eq(experts.structureId, structureId));
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

  async findAllPourListe(): Promise<StructurePourListe[]> {
    const [lignes, departementsAv, departementsExperts, agentsActifs] = await Promise.all([
      db
        .select({
          id: structures.id,
          type: structures.type,
          nom: structures.nom,
          siret: structures.siret,
          amoDepartements: entreprisesAmo.departements,
          avId: allersVers.id,
          expertId: experts.id,
          expertDesactiveAt: experts.desactiveAt,
        })
        .from(structures)
        .leftJoin(entreprisesAmo, eq(entreprisesAmo.structureId, structures.id))
        .leftJoin(allersVers, eq(allersVers.structureId, structures.id))
        .leftJoin(experts, eq(experts.structureId, structures.id))
        .orderBy(asc(structures.nom)),
      db
        .select({ id: allersVersDepartements.allersVersId, code: allersVersDepartements.codeDepartement })
        .from(allersVersDepartements),
      db
        .select({ id: expertsDepartements.expertId, code: expertsDepartements.codeDepartement })
        .from(expertsDepartements),
      db
        .select({ structureId: agents.structureId, nombre: sql<number>`cast(count(*) as integer)` })
        .from(agents)
        .where(isNull(agents.desactiveAt))
        .groupBy(agents.structureId),
    ]);

    const parLigne = (paires: { id: string; code: string }[]) => {
      const codes = new Map<string, string[]>();
      for (const { id, code } of paires) codes.set(id, [...(codes.get(id) ?? []), code]);
      return codes;
    };
    const codesAv = parLigne(departementsAv);
    const codesExperts = parLigne(departementsExperts);
    const actifs = new Map(agentsActifs.map((ligne) => [ligne.structureId, ligne.nombre]));

    return lignes.map((ligne) => ({
      id: ligne.id,
      type: ligne.type,
      nom: ligne.nom,
      siret: ligne.siret,
      amoDepartements: ligne.amoDepartements,
      allersVersDepartements: ligne.avId ? (codesAv.get(ligne.avId) ?? []) : [],
      aAllersVers: !!ligne.avId,
      expertDepartements: ligne.expertId ? (codesExperts.get(ligne.expertId) ?? []) : [],
      aExpert: !!ligne.expertId,
      expertDesactive: !!ligne.expertDesactiveAt,
      agentsActifs: actifs.get(ligne.id) ?? 0,
    }));
  }

  private selectAvecHabilitations(executor: StructuresExecutor) {
    return executor
      .select({
        id: structures.id,
        type: structures.type,
        nom: structures.nom,
        amoId: entreprisesAmo.id,
        amoNom: entreprisesAmo.nom,
        avId: allersVers.id,
        avNom: allersVers.nom,
        expertId: experts.id,
        expertNom: experts.nom,
      })
      .from(structures)
      .leftJoin(entreprisesAmo, eq(entreprisesAmo.structureId, structures.id))
      .leftJoin(allersVers, eq(allersVers.structureId, structures.id))
      .leftJoin(experts, eq(experts.structureId, structures.id));
  }
}

function versStructure(ligne: {
  id: string;
  type: TypeStructure;
  nom: string;
  amoId: string | null;
  amoNom: string | null;
  avId: string | null;
  avNom: string | null;
  expertId: string | null;
  expertNom: string | null;
}): StructureAvecHabilitations {
  return {
    id: ligne.id,
    type: ligne.type,
    nom: ligne.nom,
    entrepriseAmo: ligne.amoId && ligne.amoNom ? { id: ligne.amoId, nom: ligne.amoNom } : null,
    allersVers: ligne.avId && ligne.avNom ? { id: ligne.avId, nom: ligne.avNom } : null,
    expert: ligne.expertId && ligne.expertNom ? { id: ligne.expertId, nom: ligne.expertNom } : null,
  };
}

export const structuresRepository = new StructuresRepository();
