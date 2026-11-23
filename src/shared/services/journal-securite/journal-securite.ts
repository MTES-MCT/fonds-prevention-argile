import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { adresseDepuisEnTetes } from "@/shared/utils/adresse-client.utils";

// Journal de sécurité : une ligne JSON par évènement sur la sortie standard, gardée un an par l'hébergeur (ADR-0055).

export const EVENEMENTS_SECURITE = [
  "connexion_agent",
  "connexion_demandeur",
  "deconnexion_agent",
  "deconnexion_demandeur",
  "acces_refuse",
  "debit_depasse",
  "agent_cree",
  "agent_modifie",
  "agent_desactive",
  "agent_reactive",
  "agent_supprime",
  "structure_creee",
  "structure_modifiee",
  "structure_supprimee",
  "habilitation_ajoutee",
  "habilitation_modifiee",
  "habilitation_retiree",
  "structures_importees",
  "expert_desactive",
  "expert_reactive",
  "synchronisation_lancee",
  "amo_rattachee",
  "observation_dn_resolue",
  "sondage_dn_lance",
  "reconciliation_analysee",
] as const;

export type EvenementSecurite = (typeof EVENEMENTS_SECURITE)[number];

export type ResultatSecurite = "succes" | "refus" | "echec";

export type ActeurSecurite =
  | { type: "agent"; id: string; role?: string }
  | { type: "demandeur"; id: string }
  | { type: "systeme"; id: string }
  | { type: "anonyme" };

export type TypeCible = "agent" | "structure" | "expert" | "parcours" | "dossier_dn" | "route";

type ValeurDetail = string | number | boolean | null | undefined;

export interface EntreeJournal {
  evenement: EvenementSecurite;
  /** « succes » par défaut. */
  resultat?: ResultatSecurite;
  acteur: ActeurSecurite;
  cible?: { type: TypeCible; id: string };
  /** Code court d'un refus ou d'un échec, jamais un message d'erreur. */
  motif?: string;
  /** Identifiants techniques, codes et compteurs seulement : ni nom, ni email, ni texte saisi. */
  details?: Record<string, ValeurDetail>;
  /** À fournir quand la requête est sous la main ; sinon lue dans les en-têtes de la requête en cours. */
  ip?: string;
}

const LONGUEUR_MAX = 120;

// Filet : un email ou un texte libre passé par erreur ne doit pas atteindre un journal gardé un an.
function assainir(valeur: string): string {
  return valeur.includes("@") ? "[masque]" : valeur.slice(0, LONGUEUR_MAX);
}

function assainirDetails(details: Record<string, ValeurDetail>): Record<string, string | number | boolean | null> {
  const propres: Record<string, string | number | boolean | null> = {};
  for (const [cle, valeur] of Object.entries(details)) {
    if (valeur === undefined) continue;
    propres[cle] = typeof valeur === "string" ? assainir(valeur) : valeur;
  }
  return propres;
}

async function adresseCourante(): Promise<string> {
  try {
    return adresseDepuisEnTetes(await headers());
  } catch (error) {
    unstable_rethrow(error);
    return "inconnue";
  }
}

/** Écrit un évènement au journal. N'échoue jamais : le journal ne doit pas invalider l'opération tracée. */
export async function journaliser(entree: EntreeJournal): Promise<void> {
  const ip = entree.ip ?? (await adresseCourante());
  try {
    const ligne = {
      journal: "securite",
      v: 1,
      date: new Date().toISOString(),
      evenement: entree.evenement,
      resultat: entree.resultat ?? "succes",
      acteur: entree.acteur,
      ...(entree.cible ? { cible: { type: entree.cible.type, id: assainir(entree.cible.id) } } : {}),
      ...(entree.motif ? { motif: assainir(entree.motif) } : {}),
      ...(entree.details ? { details: assainirDetails(entree.details) } : {}),
      ip,
    };
    console.log(JSON.stringify(ligne));
  } catch {
    console.error(`[journal-securite] écriture impossible (${entree.evenement})`);
  }
}
