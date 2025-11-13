import * as XLSX from "xlsx";
import { db } from "@/shared/database/client";
import {
  entreprisesAmo,
  entreprisesAmoCommunes,
  entreprisesAmoEpci,
} from "@/shared/database/schema";
import { eq } from "drizzle-orm";

interface AmoRow {
  nom: string;
  epci: string;
  siret: string;
  departements: string;
  emails: string;
  telephone: string;
  adresse: string;
  codes_insee: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    entreprisesCreated: number;
    entreprisesUpdated: number;
    communesCreated: number;
    epciCreated: number;
  };
  errors?: string[];
}

/**
 * Service d'import des AMO depuis Excel
 */

/**
 * Parse et importe les données AMO depuis un fichier Excel
 * Utilise le SIRET comme clé unique pour UPDATE ou INSERT
 */
export async function importAmosFromExcel(
  formData: FormData,
  clearExisting: boolean = false
): Promise<ImportResult> {
  // 1. Récupérer le fichier
  const file = formData.get("file") as File;

  if (!file) {
    return {
      success: false,
      message: "Aucun fichier fourni",
    };
  }

  // Vérifier le type de fichier
  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return {
      success: false,
      message: "Le fichier doit être au format Excel (.xlsx ou .xls)",
    };
  }

  // 2. Lire le fichier Excel
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    cellDates: true,
    cellStyles: true,
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 3. Convertir en JSON
  const data = XLSX.utils.sheet_to_json<AmoRow>(worksheet);

  if (data.length === 0) {
    return {
      success: false,
      message: "Le fichier Excel est vide",
    };
  }

  // 4. Valider la structure
  const requiredColumns = [
    "nom",
    "siret",
    "departements",
    "emails",
    "telephone",
    "adresse",
  ];
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

  if (missingColumns.length > 0) {
    return {
      success: false,
      message: `Colonnes manquantes : ${missingColumns.join(", ")}`,
    };
  }

  // 5. Nettoyer les tables existantes si demandé (ATTENTION: ne jamais utiliser en prod)
  if (clearExisting) {
    await db.delete(entreprisesAmoEpci);
    await db.delete(entreprisesAmoCommunes);
    await db.delete(entreprisesAmo);
  }

  // 6. Insérer ou mettre à jour les données
  let entreprisesCreated = 0;
  let entreprisesUpdated = 0;
  let communesCreated = 0;
  let epciCreated = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      // Validation basique
      if (!row.nom?.trim()) {
        errors.push(`Ligne ignorée : nom manquant`);
        continue;
      }

      // Validation SIRET
      const siret = String(row.siret || "").trim();
      if (!siret || !/^\d{14}$/.test(siret)) {
        errors.push(`${row.nom} : SIRET invalide (doit être 14 chiffres)`);
        continue;
      }

      // Validation emails
      if (!row.emails?.trim()) {
        errors.push(`${row.nom} : emails manquants`);
        continue;
      }

      const emailsList = row.emails
        .split(";")
        .map((e) => e.trim())
        .filter((e) => e.includes("@"));

      if (emailsList.length === 0) {
        errors.push(`${row.nom} : aucun email valide trouvé`);
        continue;
      }

      // Validation départements
      if (!row.departements?.trim()) {
        errors.push(`${row.nom} : départements manquants`);
        continue;
      }

      // Nettoyer les départements
      const departementsFormatted = row.departements
        .split(",")
        .map((dep) => dep.trim())
        .filter((dep) => dep.length > 0)
        .join(", ");

      // Vérifier si l'AMO existe déjà (basé sur SIRET)
      const existingAmo = await db
        .select({ id: entreprisesAmo.id })
        .from(entreprisesAmo)
        .where(eq(entreprisesAmo.siret, siret))
        .limit(1);

      const isUpdate = existingAmo.length > 0;

      // UPSERT de l'entreprise (INSERT ou UPDATE selon existence)
      const [entreprise] = await db
        .insert(entreprisesAmo)
        .values({
          nom: row.nom.trim(),
          siret,
          departements: departementsFormatted,
          emails: emailsList.join(";"),
          telephone: formatTelephone(row.telephone),
          adresse: String(row.adresse || "").trim(),
        })
        .onConflictDoUpdate({
          target: entreprisesAmo.siret,
          set: {
            nom: row.nom.trim(),
            departements: departementsFormatted,
            emails: emailsList.join(";"),
            telephone: formatTelephone(row.telephone),
            adresse: String(row.adresse || "").trim(),
            updatedAt: new Date(),
          },
        })
        .returning();

      if (isUpdate) {
        entreprisesUpdated++;
      } else {
        entreprisesCreated++;
      }

      // Supprimer les anciens EPCI et communes de cette AMO
      await db
        .delete(entreprisesAmoEpci)
        .where(eq(entreprisesAmoEpci.entrepriseAmoId, entreprise.id));

      await db
        .delete(entreprisesAmoCommunes)
        .where(eq(entreprisesAmoCommunes.entrepriseAmoId, entreprise.id));

      // Parser et insérer les nouveaux codes EPCI (optionnel)
      if (row.epci?.trim()) {
        const codesEpci = row.epci
          .split(";")
          .map((code) => code.trim())
          .filter((code) => /^\d{9}$/.test(code));

        if (codesEpci.length > 0) {
          const epciData = codesEpci.map((codeEpci) => ({
            entrepriseAmoId: entreprise.id,
            codeEpci,
          }));

          await db.insert(entreprisesAmoEpci).values(epciData);
          epciCreated += codesEpci.length;
        }
      }

      // Parser et insérer les nouveaux codes INSEE (optionnel)
      if (row.codes_insee?.trim()) {
        const codesInsee = row.codes_insee
          .split(",")
          .map((code) => code.trim())
          .filter((code) => /^\d{5}$/.test(code));

        if (codesInsee.length > 0) {
          const communesData = codesInsee.map((codeInsee) => ({
            entrepriseAmoId: entreprise.id,
            codeInsee,
          }));

          await db.insert(entreprisesAmoCommunes).values(communesData);
          communesCreated += codesInsee.length;
        }
      }
    } catch (error) {
      console.error(`Erreur pour ${row.nom}:`, error);
      errors.push(
        `${row.nom} : ${error instanceof Error ? error.message : "Erreur inconnue"}`
      );
    }
  }

  // 7. Retourner le résultat
  const totalEntreprises = entreprisesCreated + entreprisesUpdated;
  const actionVerb =
    entreprisesCreated > 0 && entreprisesUpdated > 0
      ? "créées/mises à jour"
      : entreprisesCreated > 0
        ? "créées"
        : "mises à jour";

  return {
    success: true,
    message: `Import réussi : ${totalEntreprises} entreprises ${actionVerb}, ${epciCreated} EPCI et ${communesCreated} communes associées`,
    stats: {
      entreprisesCreated,
      entreprisesUpdated,
      communesCreated,
      epciCreated,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Formate un numéro de téléphone français
 */
function formatTelephone(value: string | number): string {
  const tel = String(value || "").trim();

  // Si c'est un nombre et qu'il a 9 chiffres, ajouter le 0 devant
  if (/^\d{9}$/.test(tel)) {
    return `0${tel}`;
  }

  return tel;
}
