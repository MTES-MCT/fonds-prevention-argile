import ExcelJS from "exceljs";
import { db } from "@/shared/database/client";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import { allersVersRepository } from "@/shared/database/repositories/allers-vers.repository";
import { entreprisesAmoRepository } from "@/shared/database/repositories/entreprises-amo.repository";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { structuresRepository, type StructuresExecutor } from "@/shared/database/repositories/structures.repository";
import { parseCodesDepartement } from "@/shared/utils/departements.utils";
import { trouverCorrespondanceAllersVers } from "../../allers-vers/domain/value-objects/correspondance-allers-vers";
import {
  lireEntetes,
  lireStructures,
  type BilanImportStructures,
  type ChampImport,
  type LigneImport,
  type RoleImport,
  type StructureAImporter,
} from "../domain/import-structures";
import {
  LIBELLES_HABILITATION,
  messageEcarts,
  messageRemplacements,
  typeStructurePour,
} from "../domain/regles-structures";
import { rattacherStructure } from "./rattachement-import.service";

export interface OptionsImport {
  role: RoleImport;
  /** Ajouter AMO ou Aller-vers à une structure qui a des agents leur donne ce rôle. */
  peutChangerRoles: boolean;
  /** Remplacer par le fichier les coordonnées des structures existantes, au lieu de les compléter. */
  remplacer: boolean;
}

function texteCellule(cellule: ExcelJS.Cell): string {
  const valeur = cellule.value;
  if (valeur === null || valeur === undefined) return "";
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
  if (typeof valeur === "object") {
    if ("result" in valeur) return String(valeur.result ?? "").trim();
    if ("richText" in valeur)
      return valeur.richText
        .map((morceau) => morceau.text)
        .join("")
        .trim();
    if ("text" in valeur) return String(valeur.text ?? "").trim();
  }
  return String(valeur).trim();
}

async function lireClasseur(contenu: ArrayBuffer, role: RoleImport): Promise<LigneImport[] | null> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(contenu);
  const feuille = classeur.worksheets[0];
  if (!feuille) return null;

  const entetes: string[] = [];
  feuille.getRow(1).eachCell((cellule, colonne) => {
    entetes[colonne - 1] = texteCellule(cellule);
  });
  const champs = lireEntetes(
    Array.from(entetes, (entete) => entete ?? ""),
    role
  );
  if (!champs) return null;

  const lignes: LigneImport[] = [];
  feuille.eachRow((rangee, numero) => {
    if (numero === 1) return;
    const valeurs: Partial<Record<ChampImport, string>> = {};
    rangee.eachCell((cellule, colonne) => {
      const champ = champs[colonne - 1];
      if (champ) valeurs[champ] = texteCellule(cellule);
    });
    if (Object.values(valeurs).some((valeur) => valeur)) lignes.push({ numero, valeurs });
  });
  return lignes;
}

type Issue = "creee" | "mise_a_jour" | { refus: string };

/** Enregistre l'habilitation du rôle importé sur la structure de la ligne. */
async function enregistrerHabilitation(
  structure: StructureAImporter,
  structureId: string,
  nombreAgents: number,
  options: OptionsImport,
  tx: StructuresExecutor
): Promise<Issue> {
  const { role } = options;
  if (role === "expert") {
    const expert = structure.expert!;
    const existant = await expertsRepository.findByStructure(structureId, tx);
    if (!existant) {
      await expertsRepository.ajouter(structureId, expert, tx);
      return "creee";
    }
    // Une date ou un contact interne absent du fichier ne retire pas celui de la fiche.
    await expertsRepository.mettreAJour(
      existant.id,
      {
        ...expert,
        dateValidationDhup: expert.dateValidationDhup ?? existant.dateValidationDhup,
        contactInterneNom: expert.contactInterneNom ?? existant.contactInterneNom,
        contactInterneEmail: expert.contactInterneEmail ?? existant.contactInterneEmail,
        contactInterneTelephone: expert.contactInterneTelephone ?? existant.contactInterneTelephone,
      },
      tx
    );
    return "mise_a_jour";
  }

  const existante =
    role === "amo"
      ? await entreprisesAmoRepository.findHabilitationParStructure(structureId, tx)
      : await allersVersRepository.findHabilitationParStructure(structureId, tx);
  if (!existante && nombreAgents > 0 && !options.peutChangerRoles) {
    return {
      refus: `la structure a des agents : seul un super-administrateur peut lui ajouter l'habilitation ${LIBELLES_HABILITATION[role]}`,
    };
  }

  if (role === "amo") {
    const amo = structure.amo!;
    const id = existante?.id ?? (await entreprisesAmoRepository.ajouter(structureId, amo, tx));
    if (existante) await entreprisesAmoRepository.mettreAJourHabilitation(id, amo, tx);
    await entreprisesAmoRepository.updateCommunesRelations(id, amo.communes, tx);
    await entreprisesAmoRepository.updateEpciRelations(id, amo.epci, tx);
  } else {
    const av = structure.allersVers!;
    const id = existante?.id ?? (await allersVersRepository.ajouter(structureId, av.emails, tx));
    if (existante) await allersVersRepository.mettreAJourEmails(id, av.emails, tx);
    await allersVersRepository.updateDepartementsRelations(id, av.departements, tx);
    await allersVersRepository.updateEpciRelations(id, av.epci, tx);
  }
  if (!existante) await agentsRepository.resynchroniserColonnesHeritees(structureId, tx);
  return existante ? "mise_a_jour" : "creee";
}

function departementsDeLaLigne(structure: StructureAImporter): string[] {
  if (structure.amo) return parseCodesDepartement(structure.amo.departements);
  return structure.allersVers?.departements ?? [];
}

/**
 * Importe le fichier d'un rôle : chaque ligne rejoint la structure de son SIRET et du type du rôle, ou en
 * crée une. Ne supprime rien ; l'identité d'une structure existante n'est remplacée que sur demande.
 */
export async function importerStructures(
  contenu: ArrayBuffer,
  options: OptionsImport
): Promise<BilanImportStructures | { erreur: string }> {
  const { role } = options;
  const lignes = await lireClasseur(contenu, role);
  if (!lignes) return { erreur: "Colonne SIRET introuvable : partez du modèle de ce rôle" };
  if (lignes.length === 0) return { erreur: "Le fichier ne contient aucune ligne" };

  const { structures, refusees } = lireStructures(lignes, role);
  const bilan: BilanImportStructures = {
    structuresCreees: 0,
    structuresMisesAJour: 0,
    habilitationsAjoutees: 0,
    habilitationsMisesAJour: 0,
    lignesRefusees: refusees,
    avertissements: [],
  };
  const type = typeStructurePour(role);
  // Aucun Aller-vers n'a de SIRET avant le premier import : son nom et son territoire le retrouvent.
  const sansSiret = role === "expert" ? [] : await allersVersRepository.findSansSiretPourRapprochement();

  for (const structure of structures) {
    const { nom } = structure.identite;
    try {
      let structureDesignee: string | null = null;
      if (sansSiret.length > 0 && !(await structuresRepository.findIdBySiret(structure.siret, type))) {
        const correspondance = trouverCorrespondanceAllersVers(nom, departementsDeLaLigne(structure), sansSiret);
        if (correspondance.type === "ambigue") {
          bilan.lignesRefusees.push({
            ligne: structure.premiereLigne,
            motif: `« ${nom} » correspond à plusieurs structures sans SIRET : renseignez-le d'abord dans la bonne fiche`,
          });
          continue;
        }
        if (correspondance.type === "mise_a_jour") {
          structureDesignee = sansSiret.find((av) => av.id === correspondance.id)?.structureId ?? null;
        }
      }

      const resultat = await db.transaction(async (tx) => {
        const rattachement = await rattacherStructure(structure.identite, tx, {
          type,
          structureDesignee,
          remplacer: options.remplacer,
        });
        const issue = await enregistrerHabilitation(
          structure,
          rattachement.structureId,
          rattachement.nombreAgents,
          options,
          tx
        );
        return { rattachement, issue };
      });
      const { rattachement, issue } = resultat;

      if (rattachement.creee) bilan.structuresCreees++;
      else bilan.structuresMisesAJour++;
      if (structureDesignee) {
        const restante = sansSiret.findIndex((av) => av.structureId === structureDesignee);
        if (restante >= 0) sansSiret.splice(restante, 1);
        bilan.avertissements.push(`${nom} : rapproché par son nom de la structure existante, qui reçoit son SIRET`);
      }
      if (rattachement.ecarts.length > 0) bilan.avertissements.push(messageEcarts(nom, rattachement.ecarts));
      if (rattachement.remplacements.length > 0) {
        bilan.avertissements.push(messageRemplacements(nom, rattachement.remplacements));
      }
      if (issue === "creee") {
        bilan.habilitationsAjoutees++;
        if (!rattachement.creee) {
          bilan.avertissements.push(
            `${nom} : habilitation ${LIBELLES_HABILITATION[role]} ajoutée à la structure existante`
          );
        }
      } else if (issue === "mise_a_jour") {
        bilan.habilitationsMisesAJour++;
      } else {
        bilan.lignesRefusees.push({ ligne: structure.premiereLigne, motif: issue.refus });
      }
    } catch (error) {
      // Le message d'une requête en échec cite ses paramètres, donc des contacts : seul le code part au journal.
      const code = (error as { code?: string }).code ?? (error instanceof Error ? error.name : "inconnue");
      console.error(`[importerStructures] Échec d'enregistrement (${code})`);
      bilan.lignesRefusees.push({ ligne: structure.premiereLigne, motif: "enregistrement impossible" });
    }
  }

  bilan.lignesRefusees.sort((a, b) => a.ligne - b.ligne);
  return bilan;
}
