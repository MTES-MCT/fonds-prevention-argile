import { and, asc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { db } from "../client";
import { agents } from "../schema/agents";
import { experts, expertsDepartements } from "../schema/experts";
import { structuresRepository, type StructuresExecutor } from "./structures.repository";

export interface DepartementExpertLu {
  codeDepartement: string;
  email: string | null;
  telephone: string | null;
  expertNom: string | null;
  expertEmail: string | null;
  expertTelephone: string | null;
  forfaitDiagnosticHt: number | null;
  forfaitReseauHt: number | null;
}

export interface ExpertLu {
  id: string;
  nom: string;
  siret: string;
  dateValidationDhup: string | null;
  contactInterneNom: string | null;
  contactInterneEmail: string | null;
  contactInterneTelephone: string | null;
  desactiveAt: Date | null;
  desactiveParNom: string | null;
  desactiveRaison: string | null;
  departements: DepartementExpertLu[];
}

/** Ce que porte l'habilitation expert en propre ; nom et SIRET sont ceux de la structure. */
export interface ExpertAEnregistrer {
  dateValidationDhup: string | null;
  contactInterneNom: string | null;
  contactInterneEmail: string | null;
  contactInterneTelephone: string | null;
  departements: {
    code: string;
    email: string | null;
    telephone: string | null;
    expertNom: string | null;
    expertEmail: string | null;
    expertTelephone: string | null;
    forfaitDiagnosticHt: number | null;
    forfaitReseauHt: number | null;
  }[];
}

export class ExpertsRepository {
  async findAll(): Promise<ExpertLu[]> {
    return this.lire();
  }

  async findById(id: string, executor: StructuresExecutor = db): Promise<ExpertLu | null> {
    const [expert] = await this.lire(eq(experts.id, id), executor);
    return expert ?? null;
  }

  async findByStructure(structureId: string, executor: StructuresExecutor = db): Promise<ExpertLu | null> {
    const [expert] = await this.lire(eq(experts.structureId, structureId), executor);
    return expert ?? null;
  }

  async findIdBySiret(siret: string, executor: StructuresExecutor = db): Promise<string | null> {
    const [ligne] = await executor.select({ id: experts.id }).from(experts).where(eq(experts.siret, siret));
    return ligne?.id ?? null;
  }

  /** Experts actifs ayant déclaré ce département (code officiel). */
  /** Tous les experts actifs : l'annuaire « tous les départements » les répartit lui-même. */
  async findActifs(): Promise<ExpertLu[]> {
    return this.lire(isNull(experts.desactiveAt));
  }

  async findActifsDuDepartement(codeDepartement: string): Promise<ExpertLu[]> {
    const ids = await db
      .select({ id: expertsDepartements.expertId })
      .from(expertsDepartements)
      .innerJoin(experts, eq(experts.id, expertsDepartements.expertId))
      .where(and(eq(expertsDepartements.codeDepartement, codeDepartement), isNull(experts.desactiveAt)));
    if (ids.length === 0) return [];
    return this.lire(
      inArray(
        experts.id,
        ids.map((ligne) => ligne.id)
      )
    );
  }

  /** Ajoute l'habilitation expert à une structure, qui doit avoir un SIRET : la ligne reprend son identité. */
  async ajouter(structureId: string, saisie: ExpertAEnregistrer, executor: StructuresExecutor): Promise<string> {
    const identite = await structuresRepository.findIdentite(structureId, executor);
    if (!identite) throw new Error("Structure introuvable");
    if (!identite.siret)
      throw new Error("Renseignez le SIRET de la structure avant de lui ajouter l'habilitation expert");
    const [cree] = await executor
      .insert(experts)
      .values({ ...colonnesExpert(saisie), nom: identite.nom, siret: identite.siret, structureId })
      .returning({ id: experts.id });
    await this.remplacerDepartements(cree.id, saisie.departements, executor);
    return cree.id;
  }

  /** Les départements sont remplacés en bloc : la saisie fait foi. */
  async mettreAJour(id: string, saisie: ExpertAEnregistrer, executor: StructuresExecutor): Promise<void> {
    await executor
      .update(experts)
      .set({ ...colonnesExpert(saisie), updatedAt: new Date() })
      .where(eq(experts.id, id));
    await this.remplacerDepartements(id, saisie.departements, executor);
  }

  /** Ses départements partent avec lui, par cascade. */
  async supprimer(id: string, executor: StructuresExecutor): Promise<void> {
    await executor.delete(experts).where(eq(experts.id, id));
  }

  async desactiver(id: string, agentId: string | null, raison: string): Promise<boolean> {
    const lignes = await db
      .update(experts)
      .set({ desactiveAt: new Date(), desactivePar: agentId, desactiveRaison: raison, updatedAt: new Date() })
      .where(and(eq(experts.id, id), isNull(experts.desactiveAt)))
      .returning({ id: experts.id });
    return lignes.length > 0;
  }

  async reactiver(id: string): Promise<boolean> {
    const lignes = await db
      .update(experts)
      .set({ desactiveAt: null, desactivePar: null, desactiveRaison: null, updatedAt: new Date() })
      .where(eq(experts.id, id))
      .returning({ id: experts.id });
    return lignes.length > 0;
  }

  private async remplacerDepartements(
    expertId: string,
    departements: ExpertAEnregistrer["departements"],
    executor: StructuresExecutor
  ): Promise<void> {
    await executor.delete(expertsDepartements).where(eq(expertsDepartements.expertId, expertId));
    if (departements.length === 0) return;
    await executor.insert(expertsDepartements).values(
      departements.map((departement) => ({
        expertId,
        codeDepartement: departement.code,
        email: departement.email,
        telephone: departement.telephone,
        expertNom: departement.expertNom,
        expertEmail: departement.expertEmail,
        expertTelephone: departement.expertTelephone,
        forfaitDiagnosticHt: departement.forfaitDiagnosticHt,
        forfaitReseauHt: departement.forfaitReseauHt,
      }))
    );
  }

  private async lire(condition?: SQL, executor: StructuresExecutor = db): Promise<ExpertLu[]> {
    const lignes = await executor
      .select({
        expert: experts,
        desactiveParPrenom: agents.givenName,
        desactiveParNom: agents.usualName,
      })
      .from(experts)
      .leftJoin(agents, eq(agents.id, experts.desactivePar))
      .where(condition)
      .orderBy(asc(experts.nom));
    if (lignes.length === 0) return [];

    const departements = await executor
      .select()
      .from(expertsDepartements)
      .where(
        inArray(
          expertsDepartements.expertId,
          lignes.map((ligne) => ligne.expert.id)
        )
      );

    return lignes.map(({ expert, desactiveParPrenom, desactiveParNom }) => ({
      id: expert.id,
      nom: expert.nom,
      siret: expert.siret,
      dateValidationDhup: expert.dateValidationDhup,
      contactInterneNom: expert.contactInterneNom,
      contactInterneEmail: expert.contactInterneEmail,
      contactInterneTelephone: expert.contactInterneTelephone,
      desactiveAt: expert.desactiveAt,
      desactiveParNom: [desactiveParPrenom, desactiveParNom].filter(Boolean).join(" ") || null,
      desactiveRaison: expert.desactiveRaison,
      departements: departements
        .filter((departement) => departement.expertId === expert.id)
        .map((departement) => ({
          codeDepartement: departement.codeDepartement,
          email: departement.email,
          telephone: departement.telephone,
          expertNom: departement.expertNom,
          expertEmail: departement.expertEmail,
          expertTelephone: departement.expertTelephone,
          forfaitDiagnosticHt: departement.forfaitDiagnosticHt,
          forfaitReseauHt: departement.forfaitReseauHt,
        })),
    }));
  }
}

function colonnesExpert(saisie: ExpertAEnregistrer) {
  return {
    dateValidationDhup: saisie.dateValidationDhup,
    contactInterneNom: saisie.contactInterneNom,
    contactInterneEmail: saisie.contactInterneEmail,
    contactInterneTelephone: saisie.contactInterneTelephone,
  };
}

export const expertsRepository = new ExpertsRepository();
