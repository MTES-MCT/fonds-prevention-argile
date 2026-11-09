import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { asString } from "@/shared/utils/object.utils";
import type { CommuneSimulationsStats } from "./types/tableau-de-bord.types";

interface SimulationsDuParcours {
  rgaSimulationData: unknown;
  rgaSimulationDataAgent: unknown;
}

function logementDe(simulation: unknown): Record<string, unknown> | undefined {
  if (typeof simulation !== "object" || simulation === null) return undefined;
  const logement = (simulation as { logement?: unknown }).logement;
  return typeof logement === "object" && logement !== null ? (logement as Record<string, unknown>) : undefined;
}

// Le sélecteur envoie « 3 », la base stocke « 03 » depuis fix:codes-geo : on compare au format officiel.
export function classerTopCommunes(
  parcours: SimulationsDuParcours[],
  codeDepartement?: string
): CommuneSimulationsStats[] {
  const filtre = codeDepartement ? toOfficialCodeDepartement(codeDepartement) : null;
  const communes = new Map<string, CommuneSimulationsStats>();

  for (const p of parcours) {
    const logementAgent = logementDe(p.rgaSimulationDataAgent);
    const logement = logementDe(p.rgaSimulationData);
    const commune = asString(logementAgent?.commune_nom) ?? asString(logement?.commune_nom);
    const codeBrut = asString(logementAgent?.code_departement) ?? asString(logement?.code_departement);
    if (!commune || !codeBrut) continue;

    const codeDept = toOfficialCodeDepartement(codeBrut);
    if (filtre && codeDept !== filtre) continue;

    const cle = `${commune}_${codeDept}`;
    const entree = communes.get(cle) ?? { commune, codeDepartement: codeDept, simulations: 0 };
    entree.simulations += 1;
    communes.set(cle, entree);
  }

  return [...communes.values()].sort((a, b) => b.simulations - a.simulations).slice(0, 5);
}
