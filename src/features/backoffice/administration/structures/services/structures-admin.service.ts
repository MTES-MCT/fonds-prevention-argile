import { db } from "@/shared/database/client";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import {
  structuresRepository,
  type StructureAvecHabilitations,
} from "@/shared/database/repositories/structures.repository";
import {
  habilitationsDeLignes,
  ligneDeType,
  refusDetachement,
  refusFusion,
  TYPES_HABILITATION,
  type TypeHabilitation,
} from "../domain/operations-structures";

/** Refus métier, dont le message peut être montré tel quel. */
export class RefusOperationStructure extends Error {}

export interface AgentDeStructure {
  id: string;
  nomComplet: string;
  email: string;
  desactive: boolean;
}

export interface StructureAdministration {
  id: string;
  nom: string;
  entrepriseAmo: { id: string; nom: string } | null;
  allersVers: { id: string; nom: string } | null;
  expert: { id: string; nom: string } | null;
  agents: AgentDeStructure[];
}

function habilitationsDe(structure: StructureAvecHabilitations) {
  return habilitationsDeLignes(structure);
}

function ligneDe(structure: StructureAvecHabilitations, type: TypeHabilitation) {
  return ligneDeType(structure, type);
}

export async function listerStructures(): Promise<StructureAdministration[]> {
  const [structures, agents] = await Promise.all([
    structuresRepository.findAllAvecHabilitations(),
    agentsRepository.findAllAvecStructure(),
  ]);

  const agentsParStructure = new Map<string, AgentDeStructure[]>();
  for (const agent of agents) {
    if (!agent.structureId) continue;
    const liste = agentsParStructure.get(agent.structureId) ?? [];
    liste.push({
      id: agent.id,
      nomComplet: [agent.givenName, agent.usualName].filter(Boolean).join(" "),
      email: agent.email,
      desactive: agent.desactiveAt !== null,
    });
    agentsParStructure.set(agent.structureId, liste);
  }

  return structures.map((structure) => ({ ...structure, agents: agentsParStructure.get(structure.id) ?? [] }));
}

export async function renommerStructure(structureId: string, nom: string): Promise<void> {
  if (!(await structuresRepository.renommer(structureId, nom))) {
    throw new RefusOperationStructure("Structure introuvable");
  }
}

/** La source rejoint la cible avec ses habilitations et ses agents, puis disparaît. */
export async function fusionnerStructures(cibleId: string, sourceId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Toujours dans le même ordre : deux fusions croisées ne s'attendent pas mutuellement.
    for (const id of [cibleId, sourceId].sort()) {
      await structuresRepository.verrouiller(id, "exclusif", tx);
    }
    const cible = await structuresRepository.findAvecHabilitations(cibleId, tx);
    const source = await structuresRepository.findAvecHabilitations(sourceId, tx);
    if (!cible || !source) throw new RefusOperationStructure("Structure introuvable");

    const refus = refusFusion(
      { id: cible.id, habilitations: habilitationsDe(cible) },
      { id: source.id, habilitations: habilitationsDe(source) }
    );
    if (refus) throw new RefusOperationStructure(refus);

    for (const type of TYPES_HABILITATION) {
      const ligne = ligneDe(source, type);
      if (ligne) await structuresRepository.rattacherLigne(type, ligne.id, cibleId, tx);
    }
    await agentsRepository.changerDeStructure(sourceId, cibleId, tx);
    await agentsRepository.resynchroniserColonnesHeritees(cibleId, tx);
    await structuresRepository.supprimer(sourceId, tx);
  });
}

/** L'habilitation part dans une nouvelle structure à son nom ; les agents restent et perdent ce rôle. */
export async function detacherHabilitation(structureId: string, type: TypeHabilitation): Promise<void> {
  await db.transaction(async (tx) => {
    await structuresRepository.verrouiller(structureId, "exclusif", tx);
    const structure = await structuresRepository.findAvecHabilitations(structureId, tx);
    if (!structure) throw new RefusOperationStructure("Structure introuvable");

    const refus = refusDetachement(habilitationsDe(structure));
    if (refus) throw new RefusOperationStructure(refus);

    const ligne = ligneDe(structure, type)!;
    const nouvelle = await structuresRepository.creer(ligne.nom, tx);
    await structuresRepository.rattacherLigne(type, ligne.id, nouvelle, tx);
    await agentsRepository.resynchroniserColonnesHeritees(structureId, tx);
  });
}
