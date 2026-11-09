import { z } from "zod";
import {
  roleDepuisStructure,
  type AgentRole,
  type HabilitationsStructure,
  type TypeStructure,
} from "@/shared/domain/value-objects";
import type { IdentiteStructure } from "@/shared/database/repositories/structures.repository";
import { parseListe } from "@/shared/utils/liste.utils";
import { parseCodesDepartement } from "@/shared/utils/departements.utils";
import { getDepartementName } from "@/shared/constants/departements.constants";
import { codeDepartementConnu, expertSchema } from "../../experts/domain/regles-experts";
import type { ExpertAnnuaire, ExpertGestion } from "../../experts/domain/experts.types";

/** Habilitations d'une structure : AMO et Aller-vers font les rôles, expert n'en donne aucun (ADR-0052). */
export interface HabilitationsAdministrables extends HabilitationsStructure {
  expert: boolean;
}

export type TypeHabilitation = keyof HabilitationsAdministrables;

export const TYPES_HABILITATION: readonly TypeHabilitation[] = ["amo", "allersVers", "expert"];

export const LIBELLES_HABILITATION: Record<TypeHabilitation, string> = {
  amo: "AMO",
  allersVers: "Aller-vers",
  expert: "Expert",
};

export type { IdentiteStructure, TypeStructure };

/** Une structure expert ne fait que de l'expertise ; une structure d'accompagnement est AMO et/ou Aller-vers. */
export const HABILITATIONS_PAR_TYPE: Record<TypeStructure, readonly TypeHabilitation[]> = {
  accompagnement: ["amo", "allersVers"],
  expert: ["expert"],
};

export const LIBELLES_TYPE_STRUCTURE: Record<TypeStructure, string> = {
  accompagnement: "Accompagnement",
  expert: "Expert",
};

export function typeStructurePour(habilitation: TypeHabilitation): TypeStructure {
  return habilitation === "expert" ? "expert" : "accompagnement";
}

export interface AgentDeStructure {
  id: string;
  nomComplet: string;
  email: string;
  desactive: boolean;
}

/** Une ligne de la liste des structures. */
export interface StructureListee {
  id: string;
  type: TypeStructure;
  nom: string;
  siret: string | null;
  habilitations: HabilitationsAdministrables;
  expertDesactive: boolean;
  departements: string[];
  agentsActifs: number;
}

export interface HabilitationAmoFiche {
  id: string;
  departements: string;
  emails: string[];
  communes: string[];
  epci: string[];
  dossiersSuivis: number;
}

export interface HabilitationAllersVersFiche {
  id: string;
  emails: string[];
  departements: string[];
  epci: string[];
}

/** Un EPCI du référentiel de l'API Géo. */
export interface EpciReferentiel {
  code: string;
  nom: string;
  codesDepartements: string[];
}

/** Codes officiels des départements d'une AMO, stockés en texte libre (« Indre 36, Cher 18 »). */
export function codesDepartementsAmo(texte: string | null | undefined): string[] {
  return parseCodesDepartement(texte);
}

/** Texte des départements d'une AMO, au format que lisent la couverture et l'email de l'AMO. */
export function texteDepartementsAmo(codes: string[]): string {
  return codes.map((code) => `${getDepartementName(code)} ${code}`).join(", ");
}

export interface FicheStructure {
  id: string;
  type: TypeStructure;
  identite: IdentiteStructure;
  amo: HabilitationAmoFiche | null;
  allersVers: HabilitationAllersVersFiche | null;
  // Gestion (contact interne, désactivation) pour le super-administrateur, annuaire pour l'administrateur.
  expert: ExpertGestion | ExpertAnnuaire | null;
  nombreAgents: number;
  // Calculés sur toutes les habilitations, expert désactivé compris, que l'administrateur ne voit pas.
  suppressionPossible: boolean;
  siretObligatoire: boolean;
  // Noms et emails des agents : réservés au super-administrateur, qui seul les gère.
  agents: AgentDeStructure[] | null;
}

const listeEmails = z
  .string()
  .transform((valeur) => parseListe(valeur))
  .pipe(z.array(z.string().email("Email invalide")).min(1, "Au moins un email"));

const codesEpci = z.array(
  z
    .string()
    .trim()
    .regex(/^\d{9}$/, "Code EPCI invalide : 9 chiffres attendus")
);

export const identiteStructureSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire").max(255, "Nom trop long"),
  // 14 chiffres sans clé de contrôle : des SIRET d'AMO déjà en base ne la passent pas.
  siret: z
    .string()
    .nullish()
    .transform((valeur) => (valeur ?? "").replace(/\s/g, ""))
    .refine((valeur) => valeur === "" || /^\d{14}$/.test(valeur), "SIRET invalide : 14 chiffres attendus")
    .transform((valeur) => valeur || null),
  adresse: z
    .string()
    .trim()
    .max(500, "Adresse trop longue")
    .nullish()
    .transform((valeur) => valeur ?? ""),
  telephone: z
    .string()
    .trim()
    .max(20, "Téléphone trop long")
    .regex(/^[0-9+().\s-]*$/, "Téléphone invalide")
    .nullish()
    .transform((valeur) => valeur ?? ""),
  horaires: z
    .string()
    .trim()
    .max(500, "Horaires trop longs")
    .nullish()
    .transform((valeur) => valeur || null),
});

export const habilitationAmoSchema = z.object({
  departements: z
    .string()
    .transform((valeur) => parseListe(valeur).join(", "))
    .refine((valeur) => valeur.length > 0, "Au moins un département"),
  // Stockage canonique en `;` : les lecteurs (email AMO, préremplissage DN) découpent sur ce séparateur.
  emails: listeEmails.transform((emails) => emails.join(";")),
  communes: z
    .array(
      z
        .string()
        .trim()
        .regex(/^(\d{5}|2[AB]\d{3})$/, "Code INSEE invalide")
    )
    .default([]),
  epci: codesEpci.default([]),
});

export const habilitationAllersVersSchema = z
  .object({
    emails: listeEmails,
    departements: z.array(
      z.string().transform((code, ctx) => {
        const connu = codeDepartementConnu(code);
        if (!connu) ctx.addIssue({ code: "custom", message: `Département inconnu : ${code}` });
        return connu ?? code;
      })
    ),
    epci: codesEpci.default([]),
  })
  .refine((saisie) => saisie.departements.length + saisie.epci.length > 0, "Au moins un département ou un EPCI");

export const habilitationExpertSchema = expertSchema.omit({ nom: true, siret: true });

export type IdentiteSaisie = z.infer<typeof identiteStructureSchema>;
export type HabilitationAmoSaisie = z.infer<typeof habilitationAmoSchema>;
export type HabilitationAllersVersSaisie = z.infer<typeof habilitationAllersVersSchema>;
export type HabilitationExpertSaisie = z.infer<typeof habilitationExpertSchema>;

export function estExpertGestion(expert: ExpertGestion | ExpertAnnuaire): expert is ExpertGestion {
  return "contactInterne" in expert;
}

export function habilitationsDeFiche(fiche: { amo: unknown; allersVers: unknown; expert: unknown }) {
  return { amo: !!fiche.amo, allersVers: !!fiche.allersVers, expert: !!fiche.expert };
}

/** Un SIRET est indispensable au formulaire DN de l'AMO et à la liste DHUP des experts. */
export function siretObligatoire(habilitations: HabilitationsAdministrables): boolean {
  return habilitations.amo || habilitations.expert;
}

/** Rôle des agents de la structure si l'habilitation est ajoutée (présente) ou retirée. */
export function roleApres(
  habilitations: HabilitationsAdministrables,
  type: TypeHabilitation,
  presente: boolean
): AgentRole | null {
  return roleDepuisStructure({ ...habilitations, [type]: presente });
}

export function refusAjout(
  type: TypeStructure,
  habilitations: HabilitationsAdministrables,
  habilitation: TypeHabilitation
): string | null {
  if (!HABILITATIONS_PAR_TYPE[type].includes(habilitation)) {
    return type === "expert"
      ? "Une structure expert ne porte que l'habilitation expert"
      : "Une structure d'accompagnement ne peut pas être experte : créez une structure expert";
  }
  if (habilitations[habilitation]) return `La structure a déjà l'habilitation ${LIBELLES_HABILITATION[habilitation]}`;
  return null;
}

/** Une structure garde toujours une habilitation : la dernière ne se retire pas, la structure se supprime. */
export function refusRetrait(
  habilitations: HabilitationsAdministrables,
  type: TypeHabilitation,
  nombreAgents: number
): string | null {
  if (!habilitations[type]) return `La structure n'a pas d'habilitation ${LIBELLES_HABILITATION[type]}`;
  if (TYPES_HABILITATION.filter((autre) => habilitations[autre]).length === 1) {
    return "C'est sa dernière habilitation : supprimez la structure à la place";
  }
  if (nombreAgents > 0 && type !== "expert" && roleApres(habilitations, type, false) === null) {
    return "Ses agents perdraient leur seul rôle : rattachez-les à une autre structure d'abord";
  }
  return null;
}

/** Supprimer une structure emporte ses habilitations ; ni ses agents ni les dossiers de son AMO ne le permettent. */
export function refusSuppression(nombreAgents: number, dossiersSuivis: number): string | null {
  if (nombreAgents > 0) return "Rattachez d'abord ses agents à une autre structure";
  if (dossiersSuivis > 0) return `Son AMO suit ${dossiersSuivis} dossier(s) : la structure ne peut pas être supprimée`;
  return null;
}

export type CritereHabilitation = TypeHabilitation;

export interface FiltresStructures {
  // Cumulables : une structure est retenue si elle répond à l'un des critères cochés, toutes si aucun.
  habilitations: CritereHabilitation[];
  departement: string | null;
  recherche: string;
}

const sansAccents = (texte: string) =>
  texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function repondA(structure: StructureListee, critere: CritereHabilitation): boolean {
  return structure.habilitations[critere];
}

export function filtrerStructures(structures: StructureListee[], filtres: FiltresStructures): StructureListee[] {
  const recherche = sansAccents(filtres.recherche.trim());
  const rechercheSiret = filtres.recherche.replace(/\s/g, "");
  return structures.filter((structure) => {
    if (filtres.habilitations.length > 0 && !filtres.habilitations.some((critere) => repondA(structure, critere))) {
      return false;
    }
    if (filtres.departement && !structure.departements.includes(filtres.departement)) return false;
    if (!recherche) return true;
    return (
      sansAccents(structure.nom).includes(recherche) ||
      (rechercheSiret.length > 0 && (structure.siret ?? "").includes(rechercheSiret))
    );
  });
}

const LIBELLES_IDENTITE: Record<keyof IdentiteStructure, string> = {
  nom: "nom",
  siret: "SIRET",
  adresse: "adresse",
  telephone: "téléphone",
  horaires: "horaires",
};

const formeComparable = (champ: keyof IdentiteStructure, valeur: string | null) =>
  champ === "telephone" ? (valeur ?? "").replace(/\D/g, "") : (valeur ?? "").trim();

/**
 * Identité d'une structure existante après import : le fichier complète ses champs vides, et ne remplace
 * les autres que sur demande. Le SIRET, qui désigne la structure, ne se remplace jamais.
 */
export function fusionnerIdentite(
  existante: IdentiteStructure,
  fichier: IdentiteStructure,
  remplacer: boolean
): { identite: IdentiteStructure; complements: string[]; remplacements: string[]; ecarts: string[] } {
  const identite = { ...existante };
  const complements: string[] = [];
  const remplacements: string[] = [];
  const ecarts: string[] = [];
  for (const champ of Object.keys(LIBELLES_IDENTITE) as (keyof IdentiteStructure)[]) {
    const valeurFichier = formeComparable(champ, fichier[champ]);
    if (!valeurFichier) continue;
    const valeurExistante = formeComparable(champ, existante[champ]);
    if (!valeurExistante) {
      Object.assign(identite, { [champ]: fichier[champ] });
      complements.push(champ);
    } else if (valeurExistante !== valeurFichier) {
      if (remplacer && champ !== "siret") {
        Object.assign(identite, { [champ]: fichier[champ] });
        remplacements.push(LIBELLES_IDENTITE[champ]);
      } else {
        ecarts.push(LIBELLES_IDENTITE[champ]);
      }
    }
  }
  return { identite, complements, remplacements, ecarts };
}

/** Message de bilan d'import pour une structure dont la fiche diffère du fichier. */
export function messageEcarts(nom: string, ecarts: string[]): string {
  return `${nom} : ${ecarts.join(", ")} du fichier différent(s) de la fiche, non repris`;
}

export function messageRemplacements(nom: string, remplacements: string[]): string {
  return `${nom} : ${remplacements.join(", ")} remplacé(s) par la valeur du fichier`;
}
