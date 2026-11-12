import ExcelJS from "exceljs";
import { db } from "@/shared/database/client";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { expertSchema, lireDepartements, type ExpertSaisie } from "../domain/regles-experts";
import type { BilanImportExperts, LigneImportRefusee } from "../domain/experts.types";

type Champ =
  | "nom"
  | "siret"
  | "departements"
  | "dateValidationDhup"
  | "email"
  | "telephone"
  | "contactInterneNom"
  | "contactInterneEmail"
  | "contactInterneTelephone";

// En-têtes reconnus, normalisés : ceux du référencement DHUP d'abord, puis ceux du modèle de l'application.
const ENTETES: Record<string, Champ> = {
  societe: "nom",
  "raison sociale": "nom",
  nom: "nom",
  "siret/siren": "siret",
  siret: "siret",
  "departements d intervention": "departements",
  departements: "departements",
  "date de validation dhup": "dateValidationDhup",
  "adresse mail": "email",
  "email de reservation": "email",
  telephone: "telephone",
  "telephone de reservation": "telephone",
  contact: "contactInterneNom",
  "contact interne nom": "contactInterneNom",
  "contact interne email": "contactInterneEmail",
  "contact interne telephone": "contactInterneTelephone",
};

const OBLIGATOIRES: readonly Champ[] = ["nom", "siret", "departements"];

const LIBELLES_OBLIGATOIRES: Record<string, string> = {
  nom: "Société",
  siret: "SIRET",
  departements: "Départements d'intervention",
};

function normaliserEntete(entete: string): string {
  return entete
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/n°\s*/g, "")
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();
}

function texteCellule(cellule: ExcelJS.Cell): string {
  const valeur = cellule.value;
  if (valeur === null || valeur === undefined) return "";
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
  if (typeof valeur === "object") {
    if ("result" in valeur) return String(valeur.result ?? "");
    if ("richText" in valeur) return valeur.richText.map((morceau) => morceau.text).join("");
    if ("text" in valeur) return String(valeur.text ?? "");
  }
  return String(valeur).trim();
}

// Excel lit « 01/06/2026 » comme du texte et « 0612345678 » comme le nombre 612345678.
function dateIso(saisie: string): string | null {
  if (!saisie) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(saisie)) return saisie;
  const francaise = saisie.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (francaise) return `${francaise[3]}-${francaise[2].padStart(2, "0")}-${francaise[1].padStart(2, "0")}`;
  return saisie;
}

function telephone(saisie: string): string {
  return /^[1-9]\d{8}$/.test(saisie) ? `0${saisie}` : saisie;
}

interface LigneLue {
  numero: number;
  valeurs: Partial<Record<Champ, string>>;
}

async function lireClasseur(contenu: ArrayBuffer): Promise<{ lignes: LigneLue[]; colonnesManquantes: string[] }> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(contenu);
  const feuille = classeur.worksheets[0];
  if (!feuille) return { lignes: [], colonnesManquantes: [...OBLIGATOIRES] };

  const colonnes = new Map<number, Champ>();
  feuille.getRow(1).eachCell((cellule, colonne) => {
    const champ = ENTETES[normaliserEntete(texteCellule(cellule))];
    if (champ) colonnes.set(colonne, champ);
  });
  const presents = new Set(colonnes.values());
  const colonnesManquantes = OBLIGATOIRES.filter((champ) => !presents.has(champ));

  const lignes: LigneLue[] = [];
  feuille.eachRow((rangee, numero) => {
    if (numero === 1) return;
    const valeurs: Partial<Record<Champ, string>> = {};
    rangee.eachCell((cellule, colonne) => {
      const champ = colonnes.get(colonne);
      if (champ) valeurs[champ] = texteCellule(cellule);
    });
    if (Object.values(valeurs).some((valeur) => valeur)) lignes.push({ numero, valeurs });
  });
  return { lignes, colonnesManquantes };
}

/** Une ligne valide, rattachée à son SIRET ; un SIRET peut s'étaler sur plusieurs lignes. */
interface LigneValide {
  numero: number;
  saisie: ExpertSaisie;
}

function validerLigne(ligne: LigneLue): LigneValide | LigneImportRefusee {
  const v = ligne.valeurs;
  const { codes, inconnus } = lireDepartements(v.departements ?? "");
  if (inconnus.length > 0) {
    return { ligne: ligne.numero, motif: `département inconnu : ${inconnus.map((d) => `« ${d} »`).join(", ")}` };
  }
  const resultat = expertSchema.safeParse({
    nom: v.nom ?? "",
    siret: v.siret ?? "",
    dateValidationDhup: dateIso(v.dateValidationDhup ?? ""),
    contactInterneNom: v.contactInterneNom,
    contactInterneEmail: v.contactInterneEmail,
    contactInterneTelephone: telephone(v.contactInterneTelephone ?? ""),
    departements: codes.map((code) => ({ code, email: v.email, telephone: telephone(v.telephone ?? "") })),
  });
  if (!resultat.success) {
    const probleme = resultat.error.issues[0];
    const motif =
      probleme.path[0] === "siret" ? `SIRET invalide « ${v.siret ?? ""} » (14 chiffres attendus)` : probleme.message;
    return { ligne: ligne.numero, motif };
  }
  return { numero: ligne.numero, saisie: resultat.data };
}

/** Lignes d'un même SIRET réunies ; un département déjà déclaré plus haut refuse la ligne qui le répète. */
function regrouper(lignes: LigneValide[], refusees: LigneImportRefusee[]): Map<string, LigneValide[]> {
  const groupes = new Map<string, LigneValide[]>();
  for (const ligne of lignes) {
    const groupe = groupes.get(ligne.saisie.siret) ?? [];
    const dejaDeclares = new Set(groupe.flatMap((l) => l.saisie.departements.map((d) => d.code)));
    const doublon = ligne.saisie.departements.find((d) => dejaDeclares.has(d.code));
    if (doublon) {
      refusees.push({ ligne: ligne.numero, motif: `département ${doublon.code} déjà déclaré pour ce SIRET` });
      continue;
    }
    groupe.push(ligne);
    groupes.set(ligne.saisie.siret, groupe);
  }
  return groupes;
}

function fusionner(groupe: LigneValide[]): ExpertSaisie {
  const premiere = (champ: keyof ExpertSaisie) =>
    (groupe.map((l) => l.saisie[champ]).find((valeur) => valeur) ?? null) as string | null;
  return {
    nom: groupe[0].saisie.nom,
    siret: groupe[0].saisie.siret,
    dateValidationDhup: premiere("dateValidationDhup"),
    contactInterneNom: premiere("contactInterneNom"),
    contactInterneEmail: premiere("contactInterneEmail"),
    contactInterneTelephone: premiere("contactInterneTelephone"),
    departements: groupe.flatMap((l) => l.saisie.departements),
  };
}

/**
 * Crée ou met à jour un expert par SIRET. Les départements du fichier remplacent ceux de l'expert ;
 * une date ou un contact interne absent du fichier ne retire pas celui saisi dans l'administration.
 */
export async function importerExperts(contenu: ArrayBuffer): Promise<BilanImportExperts | { erreur: string }> {
  const { lignes, colonnesManquantes } = await lireClasseur(contenu);
  if (colonnesManquantes.length > 0) {
    return {
      erreur: `Colonnes manquantes : ${colonnesManquantes.map((champ) => LIBELLES_OBLIGATOIRES[champ]).join(", ")}`,
    };
  }
  if (lignes.length === 0) return { erreur: "Le fichier ne contient aucune ligne" };

  const lignesRefusees: LigneImportRefusee[] = [];
  const valides: LigneValide[] = [];
  for (const ligne of lignes) {
    const verdict = validerLigne(ligne);
    if ("motif" in verdict) lignesRefusees.push(verdict);
    else valides.push(verdict);
  }

  let crees = 0;
  let misAJour = 0;
  for (const groupe of regrouper(valides, lignesRefusees).values()) {
    const saisie = fusionner(groupe);
    try {
      const cree = await db.transaction(async (tx) => {
        const id = await expertsRepository.findIdBySiret(saisie.siret, tx);
        if (!id) {
          await expertsRepository.creer(saisie, tx);
          return true;
        }
        const existant = await expertsRepository.findById(id, tx);
        await expertsRepository.mettreAJour(
          id,
          {
            ...saisie,
            dateValidationDhup: saisie.dateValidationDhup ?? existant?.dateValidationDhup ?? null,
            contactInterneNom: saisie.contactInterneNom ?? existant?.contactInterneNom ?? null,
            contactInterneEmail: saisie.contactInterneEmail ?? existant?.contactInterneEmail ?? null,
            contactInterneTelephone: saisie.contactInterneTelephone ?? existant?.contactInterneTelephone ?? null,
          },
          tx
        );
        return false;
      });
      if (cree) crees++;
      else misAJour++;
    } catch (error) {
      // Le message d'une requête en échec cite ses paramètres, donc des contacts : seul le code part au journal.
      const code = (error as { code?: string }).code ?? (error instanceof Error ? error.name : "inconnue");
      console.error(`[importerExperts] Échec d'enregistrement (${code})`);
      for (const ligne of groupe) lignesRefusees.push({ ligne: ligne.numero, motif: "enregistrement impossible" });
    }
  }

  lignesRefusees.sort((a, b) => a.ligne - b.ligne);
  return { crees, misAJour, lignesRefusees };
}
