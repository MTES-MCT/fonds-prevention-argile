import { db } from "@/shared/database/client";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { trierExperts, type ExpertSaisie } from "../domain/regles-experts";
import { versAnnuaire, versGestion } from "../domain/projections-experts";
import type { ExpertAnnuaire, ExpertGestion } from "../domain/experts.types";

/** Refus métier, dont le message peut être montré tel quel. */
export class RefusOperationExpert extends Error {}

/** Toute la liste, désactivés compris : réservé au super-administrateur. */
export async function listerExpertsGestion(): Promise<ExpertGestion[]> {
  return trierExperts((await expertsRepository.findAll()).map(versGestion));
}

/** Annuaire de tous les départements, experts actifs seulement. */
export async function listerAnnuaireComplet(): Promise<ExpertAnnuaire[]> {
  return trierExperts((await expertsRepository.findAll()).filter((expert) => !expert.desactiveAt).map(versAnnuaire));
}

export async function creerExpert(saisie: ExpertSaisie): Promise<string> {
  return db.transaction(async (tx) => {
    if (await expertsRepository.findIdBySiret(saisie.siret, tx)) {
      throw new RefusOperationExpert("Un expert existe déjà avec ce SIRET");
    }
    return expertsRepository.creer(saisie, tx);
  });
}

export async function modifierExpert(id: string, saisie: ExpertSaisie): Promise<void> {
  await db.transaction(async (tx) => {
    if (!(await expertsRepository.findById(id, tx))) throw new RefusOperationExpert("Expert introuvable");
    const titulaire = await expertsRepository.findIdBySiret(saisie.siret, tx);
    if (titulaire && titulaire !== id) throw new RefusOperationExpert("Un autre expert a déjà ce SIRET");
    await expertsRepository.mettreAJour(id, saisie, tx);
  });
}

export async function desactiverExpert(id: string, agentId: string | null, raison: string): Promise<void> {
  if (!(await expertsRepository.desactiver(id, agentId, raison))) {
    throw new RefusOperationExpert("Expert introuvable ou déjà désactivé");
  }
}

export async function reactiverExpert(id: string): Promise<void> {
  if (!(await expertsRepository.reactiver(id))) throw new RefusOperationExpert("Expert introuvable");
}
