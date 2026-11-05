import { z } from "zod";
import { UserRole } from "@/shared/domain/value-objects";
import {
  DEPARTEMENTS,
  getDepartementName,
  normalizeCodeDepartement,
  toOfficialCodeDepartement,
} from "@/shared/constants/departements.constants";
import { parseListe } from "@/shared/utils/liste.utils";

/** Texte à faire valider par la DHUP : il accompagne chaque liste d'experts (ADR-0052). */
export const MENTION_LIBRE_CHOIX =
  "Liste des experts validés par la DHUP, présentés sans ordre de préférence. Vous êtes libre de faire appel à l'expert de votre choix.";

export const MESSAGE_AUCUN_EXPERT = "Aucun expert validé dans ce département pour l'instant";

// SIREN de La Poste : ses établissements dérogent à la clé de Luhn (règle INSEE).
const SIREN_LA_POSTE = "356000000";

/** SIRET : 14 chiffres et clé de Luhn, qui écarte la plupart des fautes de frappe. */
export function estSiretValide(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  if (siret.startsWith(SIREN_LA_POSTE)) {
    return [...siret].reduce((somme, chiffre) => somme + Number(chiffre), 0) % 5 === 0;
  }
  const somme = [...siret].reverse().reduce((total, caractere, rang) => {
    const chiffre = Number(caractere) * (rang % 2 === 1 ? 2 : 1);
    return total + (chiffre > 9 ? chiffre - 9 : chiffre);
  }, 0);
  return somme % 10 === 0;
}

/** Code officiel (« 03 », « 2A », « 971 ») d'un département connu, null sinon. */
export function codeDepartementConnu(saisie: string): string | null {
  const brut = saisie.trim().toUpperCase();
  if (!/^(2[AB]|\d{1,3})$/.test(brut)) return null;
  const code = toOfficialCodeDepartement(brut);
  return DEPARTEMENTS[code] || DEPARTEMENTS[normalizeCodeDepartement(brut)] ? code : null;
}

/**
 * Départements d'une cellule d'import : « 63 », « 03 ; 36 », « Allier 03 ».
 * Un Excel lit « 03 » comme le nombre 3 : un code sans zéro initial est donc accepté.
 */
export function lireDepartements(cellule: string): { codes: string[]; inconnus: string[] } {
  const codes: string[] = [];
  const inconnus: string[] = [];
  for (const element of parseListe(cellule)) {
    const candidat = element.match(/(?:^|\s)(2[AB]|\d{1,3})$/i)?.[1];
    const code = candidat ? codeDepartementConnu(candidat) : null;
    if (code) {
      if (!codes.includes(code)) codes.push(code);
    } else {
      inconnus.push(element);
    }
  }
  return { codes, inconnus };
}

// Une seule écriture par département (la table en porte deux : « 3 » et « 03 »), Corse générique exclue.
export const DEPARTEMENTS_OFFICIELS: readonly { code: string; nom: string }[] = [
  ...new Set(
    Object.keys(DEPARTEMENTS)
      .filter((code) => code !== "20")
      .map((code) => toOfficialCodeDepartement(code))
  ),
]
  .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
  .map((code) => ({ code, nom: getDepartementName(code) }));

/** Ce qu'un rôle peut consulter de l'annuaire. */
export type PerimetreExperts =
  | { type: "tous"; departementsParDefaut: string[] }
  | { type: "territoire"; departements: string[] }
  | { type: "aucun" };

/** L'analyste départemental ne voit que son territoire ; AMO et Aller-vers consultent tout, leur territoire d'abord. */
export function perimetreExperts(role: string, departementsDuScope: string[]): PerimetreExperts {
  const departements = [...new Set(departementsDuScope.map((code) => toOfficialCodeDepartement(code)))];
  switch (role) {
    case UserRole.SUPER_ADMINISTRATEUR:
    case UserRole.ADMINISTRATEUR:
      return { type: "tous", departementsParDefaut: [] };
    case UserRole.AMO:
    case UserRole.ALLERS_VERS:
    case UserRole.AMO_ET_ALLERS_VERS:
      return { type: "tous", departementsParDefaut: departements };
    case UserRole.ANALYSTE:
      return departements.length > 0 ? { type: "territoire", departements } : { type: "aucun" };
    default:
      return { type: "aucun" };
  }
}

export function peutConsulterDepartement(perimetre: PerimetreExperts, code: string): boolean {
  if (perimetre.type === "tous") return true;
  if (perimetre.type === "territoire") return perimetre.departements.includes(toOfficialCodeDepartement(code));
  return false;
}

/** Département affiché par défaut : celui demandé s'il est consultable, sinon le premier du territoire. */
export function departementAffiche(perimetre: PerimetreExperts, demande: string | null | undefined): string | null {
  const code = demande ? codeDepartementConnu(demande) : null;
  if (code && peutConsulterDepartement(perimetre, code)) return code;
  if (perimetre.type === "territoire") return perimetre.departements[0] ?? null;
  if (perimetre.type === "tous") return perimetre.departementsParDefaut[0] ?? null;
  return null;
}

/** Ordre neutre et stable : alphabétique sur la raison sociale, sans accent ni casse (ADR-0052). */
export function trierExperts<T extends { nom: string }>(experts: T[]): T[] {
  return [...experts].sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
}

const telephone = z
  .string()
  .trim()
  .max(20, "Téléphone trop long")
  .regex(/^[0-9+().\s-]*$/, "Téléphone invalide");
const email = z.string().trim().max(255).email("Email invalide");
const optionnel = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.literal("").transform(() => null), schema])
    .nullish()
    .transform((valeur) => valeur ?? null);

export const departementExpertSchema = z.object({
  code: z.string().transform((code, ctx) => {
    const connu = codeDepartementConnu(code);
    if (!connu) ctx.addIssue({ code: "custom", message: `Département inconnu : ${code}` });
    return connu ?? code;
  }),
  email: optionnel(email),
  telephone: optionnel(telephone),
});

export const expertSchema = z.object({
  nom: z.string().trim().min(1, "La raison sociale est obligatoire").max(255),
  siret: z
    .string()
    .transform((valeur) => valeur.replace(/\s/g, ""))
    .refine(estSiretValide, "SIRET invalide : 14 chiffres attendus, avec une clé valide"),
  dateValidationDhup: optionnel(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")),
  contactInterneNom: optionnel(z.string().trim().max(255)),
  contactInterneEmail: optionnel(email),
  contactInterneTelephone: optionnel(telephone),
  departements: z
    .array(departementExpertSchema)
    .min(1, "Au moins un département d'intervention")
    .refine((liste) => new Set(liste.map((d) => d.code)).size === liste.length, "Un département est déclaré deux fois"),
});

export type ExpertSaisie = z.infer<typeof expertSchema>;
