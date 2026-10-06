import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";
import { estCodeDepartementConnu } from "./simulations-departement";

export interface CompteurResultats {
  eligible: number;
  nonEligible: number;
}

/** Simulations terminées (évènements de résultat) : la somme des départements et du non-renseigné fait le total. */
export interface SimulationsTerminees {
  parDepartement: Map<string, CompteurResultats>;
  nonRenseigne: CompteurResultats;
}

export interface LigneEvenementNomme {
  Events_EventName?: string;
  Events_EventAction?: string;
  nb_events: number | string;
}

export function simulationsTermineesVides(): SimulationsTerminees {
  return { parDepartement: new Map(), nonRenseigne: { eligible: 0, nonEligible: 0 } };
}

function ajouter(cible: CompteurResultats, eligible: boolean, nombre: number) {
  if (eligible) cible.eligible += nombre;
  else cible.nonEligible += nombre;
}

// Le nom par défaut est traduit par Matomo : seul un code département connu compte, le reste est non renseigné.
export function lireSimulationsTerminees(lignes: LigneEvenementNomme[], cumul = simulationsTermineesVides()) {
  for (const ligne of lignes) {
    const action = ligne.Events_EventAction;
    if (
      action !== MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE &&
      action !== MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE
    ) {
      continue;
    }
    const nombre = Number(ligne.nb_events);
    if (!Number.isFinite(nombre)) throw new Error("Reponse Matomo inattendue (Events.getName): compteur non numerique");

    const eligible = action === MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE;
    const nom = ligne.Events_EventName?.trim() ?? "";
    if (!estCodeDepartementConnu(nom)) {
      ajouter(cumul.nonRenseigne, eligible, nombre);
      continue;
    }
    const code = toOfficialCodeDepartement(nom);
    const compteur = cumul.parDepartement.get(code) ?? { eligible: 0, nonEligible: 0 };
    ajouter(compteur, eligible, nombre);
    cumul.parDepartement.set(code, compteur);
  }
  return cumul;
}

export function cumulerSimulationsTerminees(parties: SimulationsTerminees[]): SimulationsTerminees {
  const cumul = simulationsTermineesVides();
  for (const partie of parties) {
    cumul.nonRenseigne.eligible += partie.nonRenseigne.eligible;
    cumul.nonRenseigne.nonEligible += partie.nonRenseigne.nonEligible;
    for (const [code, c] of partie.parDepartement) {
      const total = cumul.parDepartement.get(code) ?? { eligible: 0, nonEligible: 0 };
      cumul.parDepartement.set(code, {
        eligible: total.eligible + c.eligible,
        nonEligible: total.nonEligible + c.nonEligible,
      });
    }
  }
  return cumul;
}

export function totalSimulationsTerminees(simulations: SimulationsTerminees): CompteurResultats {
  let { eligible, nonEligible } = simulations.nonRenseigne;
  for (const c of simulations.parDepartement.values()) {
    eligible += c.eligible;
    nonEligible += c.nonEligible;
  }
  return { eligible, nonEligible };
}
