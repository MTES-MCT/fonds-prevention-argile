import { expertsRepository } from "@/shared/database/repositories/experts.repository";

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
