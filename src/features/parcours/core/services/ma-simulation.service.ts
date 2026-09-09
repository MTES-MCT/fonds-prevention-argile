import { getSession } from "@/features/auth/server";
import { parcoursRepo, userRepo, dossierDsRepo } from "@/shared/database/repositories";
import { formatNomComplet } from "@/shared/utils";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { getEffectiveRGAData } from "./rga-data.service";
import { raisonLectureSeule, type RaisonLectureSeule } from "../domain/value-objects/edition-simulation";

export interface MaSimulation {
  /** Simulation à afficher : la correction d'agent prime, comme partout ailleurs. */
  rgaData: RGASimulationData | null;
  nomComplet: string;
  /** Null = modifiable ; sinon, ce qui la verrouille. */
  lectureSeule: RaisonLectureSeule | null;
}

/**
 * Charge la simulation du demandeur connecté et dit s'il peut encore la modifier.
 * Retourne `null` s'il n'a ni session, ni parcours, ni simulation — l'appelant
 * renvoie alors vers le simulateur, qui reste ouvert dans ce cas.
 */
export async function getMaSimulation(): Promise<MaSimulation | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  const parcours = await parcoursRepo.findByUserId(session.userId);
  if (!parcours) return null;

  const rgaData = getEffectiveRGAData(parcours);
  if (!rgaData) return null;

  const [user, dossiers] = await Promise.all([
    userRepo.findById(session.userId),
    dossierDsRepo.findByParcoursId(parcours.id),
  ]);

  const eligibiliteDsStatus =
    (dossiers.find((dossier) => dossier.step === Step.ELIGIBILITE)?.dsStatus as DSStatus | null) ?? null;

  return {
    rgaData,
    nomComplet: formatNomComplet(user?.prenom, user?.nom),
    lectureSeule: raisonLectureSeule({
      simulationCorrigeeParAgent: Boolean(parcours.rgaSimulationDataAgent),
      eligibiliteDsStatus,
    }),
  };
}

/**
 * Vrai si le demandeur connecté a déjà une simulation : le simulateur public lui
 * est alors fermé, au profit de l'édition (une simulation par compte).
 */
export async function aDejaUneSimulation(): Promise<boolean> {
  const session = await getSession();
  if (!session?.userId) return false;

  const parcours = await parcoursRepo.findByUserId(session.userId);
  return Boolean(parcours && getEffectiveRGAData(parcours));
}
