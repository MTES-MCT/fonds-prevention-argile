import { db } from "@/shared/database/client";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import { allersVersRepository } from "@/shared/database/repositories/allers-vers.repository";
import { entreprisesAmoRepository } from "@/shared/database/repositories/entreprises-amo.repository";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { structuresRepository, type StructuresExecutor } from "@/shared/database/repositories/structures.repository";
import { parseCodesDepartement } from "@/shared/utils/departements.utils";
import { versAnnuaire, versGestion } from "../../experts/domain/projections-experts";
import {
  habilitationsDeFiche,
  refusAjout,
  refusRetrait,
  refusSuppression,
  siretObligatoire,
  typeStructurePour,
  LIBELLES_HABILITATION,
  type AgentDeStructure,
  type FicheStructure,
  type HabilitationAllersVersSaisie,
  type HabilitationAmoSaisie,
  type HabilitationExpertSaisie,
  type HabilitationsAdministrables,
  type IdentiteSaisie,
  type StructureListee,
  type TypeHabilitation,
  type TypeStructure,
} from "../domain/regles-structures";

/** Refus métier, dont le message peut être montré tel quel. */
export class RefusOperationStructure extends Error {}

/** Première ou nouvelle habilitation, avec ses données propres. */
export type HabilitationSaisie =
  | { habilitation: "amo"; saisie: HabilitationAmoSaisie }
  | { habilitation: "allersVers"; saisie: HabilitationAllersVersSaisie }
  | { habilitation: "expert"; saisie: HabilitationExpertSaisie };

/** Un expert désactivé n'existe que pour le super-administrateur, comme dans l'annuaire (ADR-0052). */
export async function listerStructures(lecteurSuperAdmin: boolean): Promise<StructureListee[]> {
  const lignes = await structuresRepository.findAllPourListe();
  return lignes
    .filter((ligne) => lecteurSuperAdmin || !ligne.expertDesactive)
    .map((ligne) => ({
      id: ligne.id,
      type: ligne.type,
      nom: ligne.nom,
      siret: ligne.siret,
      habilitations: { amo: ligne.amoDepartements !== null, allersVers: ligne.aAllersVers, expert: ligne.aExpert },
      expertDesactive: ligne.expertDesactive,
      departements: [
        ...new Set([
          ...parseCodesDepartement(ligne.amoDepartements),
          ...ligne.allersVersDepartements,
          ...ligne.expertDepartements,
        ]),
      ].sort(),
      agentsActifs: ligne.agentsActifs,
    }));
}

async function agentsDeStructure(structureId: string): Promise<AgentDeStructure[]> {
  const agents = await agentsRepository.findAllAvecStructure();
  return agents
    .filter((agent) => agent.structureId === structureId)
    .map((agent) => ({
      id: agent.id,
      nomComplet: [agent.givenName, agent.usualName].filter(Boolean).join(" "),
      email: agent.email,
      desactive: agent.desactiveAt !== null,
    }));
}

/** Null si la structure n'existe pas, ou n'est qu'un expert désactivé pour qui n'est pas super-administrateur. */
export async function chargerFiche(structureId: string, lecteurSuperAdmin: boolean): Promise<FicheStructure | null> {
  const [structure, identite] = await Promise.all([
    structuresRepository.findAvecHabilitations(structureId),
    structuresRepository.findIdentite(structureId),
  ]);
  if (!structure || !identite) return null;

  const [amo, allersVers, expert, agents] = await Promise.all([
    entreprisesAmoRepository.findHabilitationParStructure(structureId),
    allersVersRepository.findHabilitationParStructure(structureId),
    expertsRepository.findByStructure(structureId),
    agentsDeStructure(structureId),
  ]);
  if (expert?.desactiveAt && !lecteurSuperAdmin) return null;

  const dossiersSuivis = amo ? await entreprisesAmoRepository.compterValidations(amo.id) : 0;
  const habilitations = habilitationsDeFiche({ amo, allersVers, expert });
  return {
    id: structureId,
    type: structure.type,
    identite,
    amo: amo
      ? {
          id: amo.id,
          departements: amo.departements,
          emails: amo.emails.split(";").filter(Boolean),
          communes: await entreprisesAmoRepository.getCommunesByEntrepriseAmoId(amo.id),
          epci: await entreprisesAmoRepository.getEpcisByEntrepriseAmoId(amo.id),
          dossiersSuivis,
        }
      : null,
    allersVers: allersVers
      ? {
          id: allersVers.id,
          emails: allersVers.emails,
          libelleZone: allersVers.libelleZone,
          departements: await allersVersRepository.getDepartementsByAllersVersId(allersVers.id),
          epci: await allersVersRepository.getEpcisByAllersVersId(allersVers.id),
        }
      : null,
    expert: expert ? (lecteurSuperAdmin ? versGestion(expert) : versAnnuaire(expert)) : null,
    nombreAgents: agents.length,
    suppressionPossible: refusSuppression(agents.length, dossiersSuivis) === null,
    siretObligatoire: siretObligatoire(habilitations),
    agents: lecteurSuperAdmin ? agents : null,
  };
}

export async function compterAgents(structureId: string): Promise<number> {
  return agentsRepository.compterParStructure(structureId);
}

async function lireStructure(
  structureId: string,
  tx: StructuresExecutor
): Promise<{ type: TypeStructure; habilitations: HabilitationsAdministrables }> {
  const structure = await structuresRepository.findAvecHabilitations(structureId, tx);
  if (!structure) throw new RefusOperationStructure("Structure introuvable");
  return {
    type: structure.type,
    habilitations: habilitationsDeFiche({
      amo: structure.entrepriseAmo,
      allersVers: structure.allersVers,
      expert: structure.expert,
    }),
  };
}

async function verifierSiretLibre(
  siret: string | null,
  type: TypeStructure,
  structureId: string | null,
  tx: StructuresExecutor
): Promise<void> {
  if (!siret) return;
  const titulaire = await structuresRepository.findIdBySiret(siret, type, tx);
  if (titulaire && titulaire !== structureId) {
    throw new RefusOperationStructure(
      type === "expert" ? "Une autre structure expert a déjà ce SIRET" : "Une autre structure a déjà ce SIRET"
    );
  }
}

/** Enregistre l'habilitation sur une structure qui l'accepte, puis réaligne les colonnes héritées des agents. */
async function inscrireHabilitation(
  structureId: string,
  demande: HabilitationSaisie,
  tx: StructuresExecutor
): Promise<void> {
  if (demande.habilitation === "amo") {
    const id = await entreprisesAmoRepository.ajouter(structureId, demande.saisie, tx);
    await entreprisesAmoRepository.updateCommunesRelations(id, demande.saisie.communes, tx);
    await entreprisesAmoRepository.updateEpciRelations(id, demande.saisie.epci, tx);
  } else if (demande.habilitation === "allersVers") {
    const id = await allersVersRepository.ajouter(structureId, demande.saisie.emails, tx, demande.saisie.libelleZone);
    await allersVersRepository.updateDepartementsRelations(id, demande.saisie.departements, tx);
    await allersVersRepository.updateEpciRelations(id, demande.saisie.epci, tx);
  } else {
    await expertsRepository.ajouter(structureId, demande.saisie, tx);
  }
  if (demande.habilitation !== "expert") await agentsRepository.resynchroniserColonnesHeritees(structureId, tx);
}

function exigerSiret(identite: { siret: string | null }, habilitation: TypeHabilitation): void {
  if (!identite.siret && habilitation !== "allersVers") {
    throw new RefusOperationStructure(
      `Renseignez le SIRET de la structure avant de lui ajouter l'habilitation ${LIBELLES_HABILITATION[habilitation]}`
    );
  }
}

/** Une structure naît avec sa première habilitation, qui fixe son type : il n'existe pas de structure vide. */
export async function creerStructure(identite: IdentiteSaisie, premiere: HabilitationSaisie): Promise<string> {
  const type = typeStructurePour(premiere.habilitation);
  exigerSiret(identite, premiere.habilitation);
  return db.transaction(async (tx) => {
    await verifierSiretLibre(identite.siret, type, null, tx);
    const structureId = await structuresRepository.creer(identite, type, tx);
    await inscrireHabilitation(structureId, premiere, tx);
    return structureId;
  });
}

export async function modifierIdentite(structureId: string, identite: IdentiteSaisie): Promise<void> {
  await db.transaction(async (tx) => {
    await structuresRepository.verrouiller(structureId, "exclusif", tx);
    const { type, habilitations } = await lireStructure(structureId, tx);
    if (!identite.siret && siretObligatoire(habilitations)) {
      throw new RefusOperationStructure("Le SIRET est obligatoire pour une structure AMO ou expert");
    }
    await verifierSiretLibre(identite.siret, type, structureId, tx);
    await structuresRepository.mettreAJourIdentite(structureId, identite, tx);
  });
}

/** Supprime la structure et ses habilitations, si aucun agent ni aucun dossier n'en dépend. */
export async function supprimerStructure(structureId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await structuresRepository.verrouiller(structureId, "exclusif", tx);
    const amo = await entreprisesAmoRepository.findHabilitationParStructure(structureId, tx);
    const refus = refusSuppression(
      await agentsRepository.compterParStructure(structureId, tx),
      amo ? await entreprisesAmoRepository.compterValidations(amo.id) : 0
    );
    if (refus) throw new RefusOperationStructure(refus);

    if (amo) await entreprisesAmoRepository.supprimerAvecStructure(amo.id, tx);
    const allersVers = await allersVersRepository.findHabilitationParStructure(structureId, tx);
    if (allersVers) await allersVersRepository.supprimerAvecStructure(allersVers.id, tx);
    const expert = await expertsRepository.findByStructure(structureId, tx);
    if (expert) await expertsRepository.supprimer(expert.id, tx);
    await structuresRepository.supprimer(structureId, tx);
  });
}

/** Ajoute une habilitation que le type de la structure accepte, sous verrou exclusif. */
export async function ajouterHabilitation(structureId: string, demande: HabilitationSaisie): Promise<void> {
  await db.transaction(async (tx) => {
    await structuresRepository.verrouiller(structureId, "exclusif", tx);
    const { type, habilitations } = await lireStructure(structureId, tx);
    const refus = refusAjout(type, habilitations, demande.habilitation);
    if (refus) throw new RefusOperationStructure(refus);
    const identite = await structuresRepository.findIdentite(structureId, tx);
    exigerSiret(identite ?? { siret: null }, demande.habilitation);
    await inscrireHabilitation(structureId, demande, tx);
  });
}

export async function modifierHabilitation(structureId: string, demande: HabilitationSaisie): Promise<void> {
  await db.transaction(async (tx) => {
    if (demande.habilitation === "amo") {
      const amo = await entreprisesAmoRepository.findHabilitationParStructure(structureId, tx);
      if (!amo) throw new RefusOperationStructure("La structure n'a pas d'habilitation AMO");
      await entreprisesAmoRepository.mettreAJourHabilitation(amo.id, demande.saisie, tx);
      await entreprisesAmoRepository.updateCommunesRelations(amo.id, demande.saisie.communes, tx);
      await entreprisesAmoRepository.updateEpciRelations(amo.id, demande.saisie.epci, tx);
    } else if (demande.habilitation === "allersVers") {
      const allersVers = await allersVersRepository.findHabilitationParStructure(structureId, tx);
      if (!allersVers) throw new RefusOperationStructure("La structure n'a pas d'habilitation Aller-vers");
      await allersVersRepository.mettreAJourHabilitation(allersVers.id, demande.saisie, tx);
      await allersVersRepository.updateDepartementsRelations(allersVers.id, demande.saisie.departements, tx);
      await allersVersRepository.updateEpciRelations(allersVers.id, demande.saisie.epci, tx);
    } else {
      const expert = await expertsRepository.findByStructure(structureId, tx);
      if (!expert) throw new RefusOperationStructure("La structure n'a pas d'habilitation expert");
      await expertsRepository.mettreAJour(expert.id, demande.saisie, tx);
    }
  });
}

/** Retire l'AMO ou l'Aller-vers d'une structure qui garde son autre habilitation. */
export async function retirerHabilitation(structureId: string, type: "amo" | "allersVers"): Promise<void> {
  const fiche = await chargerFiche(structureId, true);
  if (!fiche) throw new RefusOperationStructure("Structure introuvable");
  const refus = refusRetrait(habilitationsDeFiche(fiche), type, fiche.nombreAgents);
  if (refus) throw new RefusOperationStructure(refus);

  if (type === "amo" && fiche.amo) {
    if (fiche.amo.dossiersSuivis > 0) {
      throw new RefusOperationStructure(
        `Cette AMO suit ${fiche.amo.dossiersSuivis} dossier(s) : son habilitation ne peut pas être retirée`
      );
    }
    await entreprisesAmoRepository.delete(fiche.amo.id);
  }
  if (type === "allersVers" && fiche.allersVers) await allersVersRepository.delete(fiche.allersVers.id);
}
