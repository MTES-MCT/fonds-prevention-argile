import { parseListe } from "@/shared/utils/liste.utils";
import { estSiretValide, lireDepartements } from "../../experts/domain/regles-experts";
import {
  habilitationAllersVersSchema,
  habilitationAmoSchema,
  habilitationExpertSchema,
  identiteStructureSchema,
  type HabilitationAllersVersSaisie,
  type HabilitationAmoSaisie,
  type HabilitationExpertSaisie,
  type IdentiteSaisie,
} from "./regles-structures";

export type ChampImport =
  | "nom"
  | "siret"
  | "adresse"
  | "telephone"
  | "horaires"
  | "amoDepartements"
  | "amoEmails"
  | "amoEpci"
  | "amoCommunes"
  | "avDepartements"
  | "avEmails"
  | "avEpci"
  | "expertDepartements"
  | "expertEmail"
  | "expertTelephone"
  | "expertSurPlaceNom"
  | "expertSurPlaceEmail"
  | "expertSurPlaceTelephone"
  | "expertForfaitDiagnostic"
  | "expertForfaitReseau"
  | "expertDateValidationDhup"
  | "expertContactInterneNom"
  | "expertContactInterneEmail"
  | "expertContactInterneTelephone";

/** Un import par rôle : la structure se déduit du SIRET, dans le type de structure du rôle. */
export type RoleImport = "amo" | "allersVers" | "expert";

const ENTETES_IDENTITE: Record<string, ChampImport> = {
  nom: "nom",
  "raison sociale": "nom",
  siret: "siret",
  adresse: "adresse",
  telephone: "telephone",
  horaires: "horaires",
};

// En-têtes des modèles, normalisés par `normaliserEntete` ; ceux des anciens fichiers restent reconnus.
const ENTETES_PAR_ROLE: Record<RoleImport, Record<string, ChampImport>> = {
  amo: {
    ...ENTETES_IDENTITE,
    departements: "amoDepartements",
    emails: "amoEmails",
    epci: "amoEpci",
    communes: "amoCommunes",
    "codes insee": "amoCommunes",
  },
  allersVers: {
    ...ENTETES_IDENTITE,
    departements: "avDepartements",
    emails: "avEmails",
    epci: "avEpci",
  },
  expert: {
    ...ENTETES_IDENTITE,
    departements: "expertDepartements",
    "email reservation": "expertEmail",
    "telephone reservation": "expertTelephone",
    "expert sur place nom": "expertSurPlaceNom",
    "expert sur place email": "expertSurPlaceEmail",
    "expert sur place telephone": "expertSurPlaceTelephone",
    "forfait diag": "expertForfaitDiagnostic",
    "forfait diagnostic": "expertForfaitDiagnostic",
    "forfait diagnostic ht": "expertForfaitDiagnostic",
    "forfait reseau": "expertForfaitReseau",
    "forfait reseaux": "expertForfaitReseau",
    "forfait reseau ht": "expertForfaitReseau",
    "date validation dhup": "expertDateValidationDhup",
    "date de validation dhup": "expertDateValidationDhup",
    "contact interne nom": "expertContactInterneNom",
    "contact interne email": "expertContactInterneEmail",
    "contact interne telephone": "expertContactInterneTelephone",
  },
};

// Référencement transmis par la DHUP, lu tel quel : son téléphone et son email sont ceux de la réservation.
const ENTETES_DHUP: Record<string, ChampImport> = {
  societe: "nom",
  "raison sociale": "nom",
  "siret/siren": "siret",
  "adresse postale": "adresse",
  "departements d intervention": "expertDepartements",
  contact: "expertContactInterneNom",
  "adresse mail": "expertEmail",
  telephone: "expertTelephone",
  "date de validation dhup": "expertDateValidationDhup",
};

export function normaliserEntete(entete: string): string {
  return entete
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/n°\s*/g, "")
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();
}

/** Champ de chaque colonne ; null sans colonne SIRET, qui désigne la structure. */
export function lireEntetes(entetes: string[], role: RoleImport): (ChampImport | null)[] | null {
  const normalises = entetes.map(normaliserEntete);
  const dhup =
    role === "expert" &&
    normalises.some((entete) => entete === "siret/siren" || entete === "departements d intervention");
  const table = dhup ? ENTETES_DHUP : ENTETES_PAR_ROLE[role];
  const champs = normalises.map((entete) => table[entete] ?? null);
  return champs.includes("siret") ? champs : null;
}

export interface LigneImport {
  numero: number;
  valeurs: Partial<Record<ChampImport, string>>;
}

export interface LigneImportRefusee {
  ligne: number;
  motif: string;
}

const MOTIF_SANS_HABILITATION: Record<RoleImport, string> = {
  amo: "aucune donnée d'AMO : départements et emails attendus",
  allersVers: "aucune donnée d'Aller-vers : territoire et emails attendus",
  expert: "aucun département d'intervention",
};

export interface StructureAImporter {
  premiereLigne: number;
  siret: string;
  identite: IdentiteSaisie;
  amo: HabilitationAmoSaisie | null;
  allersVers: HabilitationAllersVersSaisie | null;
  expert: HabilitationExpertSaisie | null;
}

export interface BilanImportStructures {
  structuresCreees: number;
  structuresMisesAJour: number;
  habilitationsAjoutees: number;
  habilitationsMisesAJour: number;
  lignesRefusees: LigneImportRefusee[];
  avertissements: string[];
}

// Excel lit « 0612345678 » comme le nombre 612345678 et « 01/06/2026 » comme du texte.
const telephone = (saisie: string | undefined) => (/^[1-9]\d{8}$/.test(saisie ?? "") ? `0${saisie}` : (saisie ?? ""));

function dateIso(saisie: string | undefined): string | null {
  if (!saisie) return null;
  const francaise = saisie.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (francaise) return `${francaise[3]}-${francaise[2].padStart(2, "0")}-${francaise[1].padStart(2, "0")}`;
  return saisie;
}

const remplie = (v: LigneImport["valeurs"], champs: ChampImport[]) => champs.some((champ) => v[champ]?.trim());

const premiereErreur = (issues: { message: string }[]) => issues[0]?.message ?? "valeur invalide";

type PartieLue<T> = { saisie: T | null } | { motif: string };

function lireAmo(v: LigneImport["valeurs"]): PartieLue<HabilitationAmoSaisie> {
  if (!remplie(v, ["amoDepartements", "amoEmails", "amoEpci", "amoCommunes"])) return { saisie: null };
  const resultat = habilitationAmoSchema.safeParse({
    departements: v.amoDepartements ?? "",
    emails: v.amoEmails ?? "",
    communes: parseListe(v.amoCommunes),
    epci: parseListe(v.amoEpci),
  });
  return resultat.success ? { saisie: resultat.data } : { motif: `AMO : ${premiereErreur(resultat.error.issues)}` };
}

function lireAllersVers(v: LigneImport["valeurs"]): PartieLue<HabilitationAllersVersSaisie> {
  if (!remplie(v, ["avDepartements", "avEmails", "avEpci"])) return { saisie: null };
  const { codes, inconnus } = lireDepartements(v.avDepartements ?? "");
  if (inconnus.length > 0) return { motif: `Aller-vers : département inconnu « ${inconnus.join(", ")} »` };
  const resultat = habilitationAllersVersSchema.safeParse({
    emails: v.avEmails ?? "",
    departements: codes,
    epci: parseListe(v.avEpci),
  });
  return resultat.success
    ? { saisie: resultat.data }
    : { motif: `Aller-vers : ${premiereErreur(resultat.error.issues)}` };
}

function lireExpert(v: LigneImport["valeurs"]): PartieLue<HabilitationExpertSaisie> {
  const champs: ChampImport[] = ["expertDepartements", "expertEmail", "expertTelephone", "expertDateValidationDhup"];
  const surPlace: ChampImport[] = ["expertSurPlaceNom", "expertSurPlaceEmail", "expertSurPlaceTelephone"];
  if (!remplie(v, [...champs, ...surPlace, "expertForfaitDiagnostic", "expertForfaitReseau"])) {
    return { saisie: null };
  }
  const { codes, inconnus } = lireDepartements(v.expertDepartements ?? "");
  if (inconnus.length > 0) return { motif: `expert : département inconnu « ${inconnus.join(", ")} »` };
  const resultat = habilitationExpertSchema.safeParse({
    dateValidationDhup: dateIso(v.expertDateValidationDhup),
    contactInterneNom: v.expertContactInterneNom,
    contactInterneEmail: v.expertContactInterneEmail,
    contactInterneTelephone: telephone(v.expertContactInterneTelephone),
    departements: codes.map((code) => ({
      code,
      email: v.expertEmail,
      telephone: telephone(v.expertTelephone),
      expertNom: v.expertSurPlaceNom,
      expertEmail: v.expertSurPlaceEmail,
      expertTelephone: telephone(v.expertSurPlaceTelephone),
      forfaitDiagnosticHt: v.expertForfaitDiagnostic,
      forfaitReseauHt: v.expertForfaitReseau,
    })),
  });
  return resultat.success ? { saisie: resultat.data } : { motif: `expert : ${premiereErreur(resultat.error.issues)}` };
}

/**
 * Regroupe les lignes par SIRET, qui désigne la structure. Un expert peut s'étaler sur plusieurs lignes,
 * chacune ajoutant des départements avec leur contact de réservation.
 */
export function lireStructures(
  lignes: LigneImport[],
  role: RoleImport
): {
  structures: StructureAImporter[];
  refusees: LigneImportRefusee[];
} {
  const refusees: LigneImportRefusee[] = [];
  const parCle = new Map<string, StructureAImporter>();

  for (const { numero, valeurs } of lignes) {
    const refuser = (motif: string) => refusees.push({ ligne: numero, motif });
    const siret = (valeurs.siret ?? "").replace(/\s/g, "") || null;
    if (!siret) {
      refuser("SIRET manquant : il désigne la structure");
      continue;
    }
    const existante = parCle.get(siret);

    const identite = identiteStructureSchema.safeParse({
      nom: valeurs.nom || existante?.identite.nom || "",
      siret,
      adresse: valeurs.adresse,
      telephone: telephone(valeurs.telephone),
      horaires: valeurs.horaires,
    });
    if (!identite.success) {
      refuser(premiereErreur(identite.error.issues));
      continue;
    }
    const amo = lireAmo(valeurs);
    const allersVers = lireAllersVers(valeurs);
    const expert = lireExpert(valeurs);
    const motif = [amo, allersVers, expert].find((partie) => "motif" in partie);
    if (motif && "motif" in motif) {
      refuser(motif.motif);
      continue;
    }
    const saisies = {
      amo: "saisie" in amo ? amo.saisie : null,
      allersVers: "saisie" in allersVers ? allersVers.saisie : null,
      expert: "saisie" in expert ? expert.saisie : null,
    };

    if (!saisies[role]) {
      refuser(MOTIF_SANS_HABILITATION[role]);
      continue;
    }
    if (saisies.expert && !estSiretValide(siret)) {
      refuser(`SIRET invalide « ${siret} » pour un expert : la clé de contrôle ne correspond pas`);
      continue;
    }

    if (!existante) {
      parCle.set(siret, { premiereLigne: numero, siret, identite: identite.data, ...saisies });
      continue;
    }
    if (saisies.amo && existante.amo) {
      refuser(`AMO déjà décrite ligne ${existante.premiereLigne} pour cette structure`);
      continue;
    }
    if (saisies.allersVers && existante.allersVers) {
      refuser(`Aller-vers déjà décrit ligne ${existante.premiereLigne} pour cette structure`);
      continue;
    }
    const dejaDeclares = new Set(existante.expert?.departements.map((d) => d.code));
    const doublon = saisies.expert?.departements.find((d) => dejaDeclares.has(d.code));
    if (doublon) {
      refuser(`département ${doublon.code} déjà déclaré pour cet expert`);
      continue;
    }

    // Une ligne de plus complète ce qui manquait, sans rien remplacer.
    const identiteFusionnee = { ...existante.identite };
    for (const champ of ["adresse", "telephone", "horaires"] as const) {
      if (!identiteFusionnee[champ] && identite.data[champ])
        Object.assign(identiteFusionnee, { [champ]: identite.data[champ] });
    }
    existante.identite = identiteFusionnee;
    existante.amo ??= saisies.amo;
    existante.allersVers ??= saisies.allersVers;
    if (saisies.expert) {
      existante.expert = existante.expert
        ? {
            dateValidationDhup: existante.expert.dateValidationDhup ?? saisies.expert.dateValidationDhup,
            contactInterneNom: existante.expert.contactInterneNom ?? saisies.expert.contactInterneNom,
            contactInterneEmail: existante.expert.contactInterneEmail ?? saisies.expert.contactInterneEmail,
            contactInterneTelephone: existante.expert.contactInterneTelephone ?? saisies.expert.contactInterneTelephone,
            departements: [...existante.expert.departements, ...saisies.expert.departements],
          }
        : saisies.expert;
    }
  }

  return { structures: [...parCle.values()], refusees };
}
