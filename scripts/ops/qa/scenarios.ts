/**
 * Scénarios de test staging : « quel dossier satisfait la précondition de cette étape
 * de checklist, et est-ce que MON compte peut agir dessus ? ».
 *
 * Chaque scénario est un prédicat sur un `DossierItem` — la ligne telle que la voit le
 * listing de l'espace agent. On raisonne donc sur exactement ce que l'agent voit, sans
 * réécrire de règle de visibilité.
 *
 * Ajouter un scénario quand on ajoute un flux : c'est ce qui évite de redécouvrir les
 * préconditions à chaque PR.
 */

import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { DOSSIER_ETAT } from "@/features/parcours/core/domain/services/dossier-etat.service";
import { STATUTS_SIMULATION_EDITABLE } from "@/features/backoffice/espace-agent/dossiers/domain/types/amo-dossiers.types";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types/dossiers-territoire.types";

/** Contexte transverse calculé une fois pour tous les scénarios. */
export interface ScenarioContext {
  /** Parcours (parmi ceux visibles) portant déjà au moins une action système. */
  parcoursAvecActionSysteme: Set<string>;
}

export interface Scenario {
  id: string;
  titre: string;
  /** Ce que la précondition permet de tester — repris tel quel dans la sortie markdown. */
  sert_a: string;
  matches: (dossier: DossierItem, ctx: ScenarioContext) => boolean;
}

/**
 * `canActAsResponsable` est la bonne garde pour les scénarios d'écriture : voir un dossier
 * ne suffit pas, l'action serait refusée côté serveur (cf. `assertCanActAsResponsable`).
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "prospect-a-qualifier",
    titre: "Prospect à qualifier par un Aller-vers",
    sert_a: "Qualifier en éligible / à qualifier / non éligible et vérifier l'action tracée",
    matches: (d) => d.validation === null && !d.archivedAt && d.canActAsResponsable,
  },
  {
    id: "demande-amo-en-attente",
    titre: "Demande d'accompagnement en attente de réponse AMO",
    sert_a: "Accepter ou refuser l'éligibilité et vérifier l'action tracée",
    // Un Aller-vers voit ces demandes sans pouvoir y répondre : seul l'AMO destinataire agit.
    matches: (d) => d.validation?.statut === StatutValidationAmo.EN_ATTENTE && !d.archivedAt && d.canActAsResponsable,
  },
  {
    id: "dossier-actif-archivable",
    titre: "Dossier actif, archivable",
    sert_a: "Archiver avec une raison et vérifier l'action « Dossier archivé »",
    // Seule la demande en attente est exclue : son écran propose le refus d'accompagnement,
    // pas la modale « Archiver ». Le détail prospect, lui, la porte (`ArchiveProspectButton`).
    matches: (d) => !d.archivedAt && d.canActAsResponsable && d.etat !== DOSSIER_ETAT.EN_ATTENTE_AMO,
  },
  {
    id: "dossier-archive",
    titre: "Dossier déjà archivé",
    sert_a: "Désarchiver et vérifier que l'action d'archivage reste visible",
    matches: (d) => d.archivedAt !== null && d.canActAsResponsable,
  },
  {
    id: "dossier-simulation-editable",
    titre: "Dossier dont la simulation est éditable",
    sert_a: "« Vérifier son éligibilité » : corriger en non éligible, puis revenir en éligible",
    matches: (d) =>
      d.validation !== null && STATUTS_SIMULATION_EDITABLE.includes(d.validation.statut) && d.canActAsResponsable,
  },
  {
    id: "dossier-avec-action-systeme",
    titre: "Dossier portant déjà une action système",
    sert_a: "Vérifier l'absence de menu Modifier / Supprimer sur une trace d'audit",
    matches: (d, ctx) => ctx.parcoursAvecActionSysteme.has(d.parcoursId),
  },
];
