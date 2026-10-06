import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";

const CLE_STOCKAGE = "fpa:simulations-suivies";
const EMPREINTES_MAX = 50;

function serialiserStable(valeur: unknown): string {
  if (Array.isArray(valeur)) return `[${valeur.map(serialiserStable).join(",")}]`;
  if (valeur && typeof valeur === "object") {
    const entrees = Object.entries(valeur as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entrees.map(([k, v]) => `${JSON.stringify(k)}:${serialiserStable(v)}`).join(",")}}`;
  }
  return JSON.stringify(valeur ?? null);
}

/** Même réponses → même empreinte, quel que soit l'ordre des clés. */
export function empreinteSimulation(reponses: unknown): string {
  const texte = serialiserStable(reponses);
  let hash = 5381;
  for (let i = 0; i < texte.length; i++) hash = ((hash << 5) + hash + texte.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

// Stockage indisponible (navigation privée stricte) : on suit quand même, mieux vaut un doublon qu'un trou.
export function premierSuiviDeLaSession(empreinte: string): boolean {
  try {
    const deja: string[] = JSON.parse(sessionStorage.getItem(CLE_STOCKAGE) ?? "[]");
    if (deja.includes(empreinte)) return false;
    sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify([...deja, empreinte].slice(-EMPREINTES_MAX)));
    return true;
  } catch {
    return true;
  }
}

/** Nom de l'évènement de résultat : le code département officiel, seule clé additive par département. */
export function nomEvenementResultat(codeDepartement: unknown): string | undefined {
  const code = typeof codeDepartement === "number" ? String(codeDepartement) : codeDepartement;
  return typeof code === "string" && code.trim() ? toOfficialCodeDepartement(code.trim()) : undefined;
}
