import { parcoursRepo } from "@/shared/database";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { perimetreListing } from "@/features/auth/permissions/domain/perimetre-listing";
import {
  filtrerMesDossiers,
  type LigneListing,
} from "@/features/backoffice/espace-agent/dossiers/services/dossiers-territoire.service";
import { travailleSurMesDossiers } from "@/features/backoffice/espace-agent/dossiers/domain/mes-dossiers";
import { cheminEspaceAgent } from "@/features/backoffice/espace-agent/dossiers/domain/chemin-espace-agent";
import { DOSSIER_STEP_LABELS } from "@/features/backoffice/espace-agent/dossiers/domain/responsable-presentation";
import { estDossierChezLaDdt } from "@/features/parcours/amo/domain/value-objects/arretAccompagnement";
import { getAgentFirstSimulation } from "@/shared/domain/utils/rga-simulation.utils";
import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import { formatNomComplet } from "@/shared/utils";
import {
  NOMBRE_DEMANDEURS_PROCHES,
  encartAffiche,
  estStatutRefuse,
  etapesProposees,
  formaterDistance,
  libelleEtapesProposees,
  plusProches,
  positionDuLogement,
  type Candidat,
  type PositionLogement,
} from "../domain";

export interface DemandeurProche {
  rang: number;
  nom: string;
  commune: string | null;
  codeDepartement: string | null;
  etape: string;
  chezLaDdt: boolean;
  distance: string;
  lat: number;
  lon: number;
  href: string;
}

export interface DemandeursProches {
  origine: PositionLogement;
  /** « au diagnostic ou en éligibilité » : complète la phrase d'introduction de l'encart. */
  etapes: string;
  /** Faux pour le super-administrateur et l'analyste, qui ne sont responsables d'aucun dossier. */
  mesDossiers: boolean;
  voisins: DemandeurProche[];
}

type Agent = Pick<AgentScopeInput, "id" | "role" | "entrepriseAmoId" | "allersVersId">;

function logementDe(ligne: Pick<LigneListing, "rgaSimulationData" | "rgaSimulationDataAgent">) {
  // La position désigne la maison visitée : la simulation de l'agent prime, comme sur la fiche.
  return getAgentFirstSimulation(ligne)?.logement;
}

/** Voisins du dossier consulté pris dans le périmètre du listing de l'agent ; null quand l'encart n'a pas lieu d'être. */
export async function chargerDemandeursProches(
  agent: Agent,
  dossier: { parcoursId: string; validationStatut: StatutValidationAmo | null }
): Promise<DemandeursProches | null> {
  const parcours = await parcoursRepo.findById(dossier.parcoursId);
  if (!parcours) return null;
  const step = parcours.currentStep as Step;
  if (!encartAffiche({ step, archivedAt: parcours.archivedAt, validationStatut: dossier.validationStatut }))
    return null;

  const scope = await calculateAgentScope(agent);
  const perimetre = perimetreListing(scope);
  const lignes =
    perimetre.kind === "aucun"
      ? []
      : await parcoursRepo.getParcoursByTerritoire(perimetre, { steps: etapesProposees(step), nonArchives: true });

  const candidates = lignes.filter(
    (ligne) => ligne.parcoursId !== dossier.parcoursId && !estStatutRefuse(ligne.validationStatut ?? null)
  );
  const mesDossiers = travailleSurMesDossiers(agent.role);
  const pool = mesDossiers ? await filtrerMesDossiers(agent, candidates) : candidates;

  const origine = positionDuLogement(logementDe(parcours));
  if (!origine) return null;

  const placees: Candidat<LigneListing>[] = pool.flatMap((ligne) => {
    const position = positionDuLogement(logementDe(ligne));
    return position ? [{ nom: formatNomComplet(ligne.userPrenom, ligne.userNom), position, donnees: ligne }] : [];
  });

  const voisins = plusProches(origine, placees, NOMBRE_DEMANDEURS_PROCHES).map((voisin, index) => {
    const ligne = voisin.donnees;
    const logement = logementDe(ligne);
    return {
      rang: index + 1,
      nom: voisin.nom,
      commune: logement?.commune_nom ?? null,
      codeDepartement: logement?.code_departement ? toOfficialCodeDepartement(logement.code_departement) : null,
      etape: DOSSIER_STEP_LABELS[ligne.currentStep],
      chezLaDdt: ligne.currentStep === Step.ELIGIBILITE && estDossierChezLaDdt(ligne.dsStatus ?? null),
      distance: formaterDistance(voisin.distanceKm),
      lat: voisin.position.lat,
      lon: voisin.position.lon,
      href: cheminEspaceAgent({
        parcoursId: ligne.parcoursId,
        archivedAt: ligne.archivedAt,
        validation: ligne.validationId
          ? { id: ligne.validationId, statut: ligne.validationStatut!, entrepriseAmoId: ligne.entrepriseAmoId }
          : null,
      }),
    };
  });

  return { origine, etapes: libelleEtapesProposees(step), mesDossiers, voisins };
}
