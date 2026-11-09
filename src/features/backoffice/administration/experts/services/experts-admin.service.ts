import { db } from "@/shared/database/client";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { trierExperts, type ExpertSaisie } from "../domain/regles-experts";
import { versAnnuaire, versGestion } from "../domain/projections-experts";
import type { ExpertAnnuaire, ExpertGestion } from "../domain/experts.types";

/** Refus métier, dont le message peut être montré tel quel. */
export class RefusOperationExpert extends Error {}

export async function desactiverExpert(id: string, agentId: string | null, raison: string): Promise<void> {
  if (!(await expertsRepository.desactiver(id, agentId, raison))) {
    throw new RefusOperationExpert("Expert introuvable ou déjà désactivé");
  }
}

export async function reactiverExpert(id: string): Promise<void> {
  if (!(await expertsRepository.reactiver(id))) throw new RefusOperationExpert("Expert introuvable");
}
