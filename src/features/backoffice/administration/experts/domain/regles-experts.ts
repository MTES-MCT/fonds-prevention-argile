import { z } from "zod";
import { UserRole } from "@/shared/domain/value-objects";
import {
  DEPARTEMENTS,
  getDepartementName,
  normalizeCodeDepartement,
  toOfficialCodeDepartement,
} from "@/shared/constants/departements.constants";
import { DEPARTEMENTS_ELIGIBLES_RGA, isDepartementEligible } from "@/shared/constants/rga.constants";
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

/**
 * L'analyste départemental ne voit que son territoire ; AMO et Aller-vers consultent tout, leur territoire
 * d'abord. « Tout », ce sont les départements du dispositif : un territoire qui déborde n'en sort pas.
 */
export function perimetreExperts(role: string, departementsDuScope: string[]): PerimetreExperts {
  const departements = [...new Set(departementsDuScope.map((code) => toOfficialCodeDepartement(code)))].filter(
    isDepartementEligible
  );
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
  if (perimetre.type === "tous") return isDepartementEligible(toOfficialCodeDepartement(code));
  if (perimetre.type === "territoire") return perimetre.departements.includes(toOfficialCodeDepartement(code));
  return false;
}

/** Ce que montre l'annuaire : un département, les départements du territoire de l'agent, ou tous. */
export type VueAnnuaire = { type: "departement"; code: string } | { type: "territoire" } | { type: "tous" };

/** Valeurs du paramètre `departement` de l'URL pour les deux vues groupées. */
export const VUE_TOUS = "tous";
export const VUE_TERRITOIRE = "territoire";

function territoireDe(perimetre: PerimetreExperts): string[] {
  if (perimetre.type === "territoire") return perimetre.departements;
  if (perimetre.type === "tous") return perimetre.departementsParDefaut;
  return [];
}

// « Votre territoire » n'a de sens que pour un agent qui en sort et qui couvre plusieurs départements.
function territoireRegroupable(perimetre: PerimetreExperts): boolean {
  return perimetre.type === "tous" && perimetre.departementsParDefaut.length > 1;
}

/** Vue demandée si elle est permise ; sinon le territoire de l'agent, ou tous les départements s'il n'en a pas. */
export function vueAffichee(perimetre: PerimetreExperts, demande: string | null | undefined): VueAnnuaire | null {
  if (perimetre.type === "aucun") return null;
  if (demande === VUE_TOUS) return { type: "tous" };
  if (demande === VUE_TERRITOIRE && territoireRegroupable(perimetre)) return { type: "territoire" };
  const code = demande ? codeDepartementConnu(demande) : null;
  if (code && peutConsulterDepartement(perimetre, code)) return { type: "departement", code };

  const territoire = territoireDe(perimetre);
  if (territoire.length === 1) return { type: "departement", code: territoire[0] };
  return territoireRegroupable(perimetre) ? { type: "territoire" } : { type: "tous" };
}

/** Départements montrés par la vue, ceux sans expert compris : l'agent doit savoir qu'il n'y en a pas. */
export function departementsDeLaVue(perimetre: PerimetreExperts, vue: VueAnnuaire): string[] {
  if (vue.type === "departement") return [vue.code];
  if (vue.type === "territoire" || perimetre.type === "territoire") return territoireDe(perimetre);
  return [...DEPARTEMENTS_ELIGIBLES_RGA];
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
// Excel et la saisie donnent « 1 200,50 € », « 1200.5 » ou 1200 : tout se ramène à des euros.
const montantHt = z
  .union([
    z.number(),
    z
      .string()
      .transform((texte) => texte.replace(/[\s€]|HT/gi, "").replace(",", "."))
      .refine((texte) => /^\d+(\.\d{1,2})?$/.test(texte), "Montant invalide : un nombre d'euros HT est attendu")
      .transform(Number),
  ])
  .pipe(z.number().min(0, "Montant invalide").max(99_999_999.99, "Montant trop élevé"));
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
  expertNom: optionnel(z.string().trim().max(255)),
  expertEmail: optionnel(email),
  expertTelephone: optionnel(telephone),
  forfaitDiagnosticHt: optionnel(montantHt),
  forfaitReseauHt: optionnel(montantHt),
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
