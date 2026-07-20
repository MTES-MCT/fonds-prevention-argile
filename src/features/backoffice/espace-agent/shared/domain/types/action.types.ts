/**
 * Types et taxonomie des actions réalisées par les agents sur un parcours.
 * Une action = un type d'action (cf. ACTION_TYPE_GROUPS) + un commentaire optionnel.
 */

/**
 * Type de structure de l'auteur de l'action.
 * `DEMANDEUR` : action déclenchée par le particulier lui-même (agent_id null).
 */
export type StructureType = "AMO" | "ALLERS_VERS" | "DDT" | "ADMINISTRATION" | "DEMANDEUR";

/** Valeur de type d'action correspondant à l'ancienne note libre */
export const ACTION_TYPE_COMMENTAIRE_LIBRE = "commentaire_libre";
/**
 * Action système (non sélectionnable dans le formulaire) : ré-ouverture d'une demande
 * refusée par l'AMO. Tracée dans l'historique pour savoir qui a ré-ouvert et quand.
 */
export const ACTION_TYPE_DOSSIER_REOUVERT = "dossier_reouvert";
/**
 * Action système : renvoi de l'email d'invitation "claim dossier" à un demandeur
 * dont le dossier a été pré-créé par un agent et qui ne l'a pas encore réclamé.
 */
export const ACTION_TYPE_INVITATION_RENVOYEE = "invitation_renvoyee";
/**
 * Action système : l'accompagnement AMO a été arrêté (par l'AMO, ou par le demandeur
 * passé en autonomie). Le message porte les raisons.
 */
export const ACTION_TYPE_ACCOMPAGNEMENT_ARRETE = "accompagnement_arrete";
/**
 * Action système : le demandeur a demandé l'arrêt de l'accompagnement et attend la
 * réponse de son AMO mandataire financier.
 */
export const ACTION_TYPE_ARRET_DEMANDE = "arret_accompagnement_demande";
/** Action système : l'AMO mandataire a refusé la demande d'arrêt et poursuit l'accompagnement. */
export const ACTION_TYPE_ARRET_REFUSE = "arret_accompagnement_refuse";
/** Valeur de type d'action "Autre" (nécessite une précision) */
export const ACTION_TYPE_AUTRE = "autre";

/**
 * Liste groupée des types d'action proposés dans le formulaire (cf. maquette).
 * Le groupe `null` correspond aux options affichées hors libellé de groupe.
 */
export const ACTION_TYPE_GROUPS = [
  {
    groupe: null,
    items: [{ value: ACTION_TYPE_COMMENTAIRE_LIBRE, label: "✍️ Commentaire libre" }],
  },
  {
    groupe: "Contact",
    items: [
      { value: "appel_effectue", label: "☎️ Appel effectué" },
      { value: "rappeler_demandeur", label: "\u{1F4DE} Rappeler le demandeur" },
      { value: "message_repondeur", label: "\u{1F4F1} Message sur répondeur" },
      { value: "email_envoye", label: "\u{1F4E7} Email envoyé" },
      { value: "visite_domicile", label: "\u{1F3E1} Visite à domicile" },
      { value: "rdv_structure", label: "\u{1F3E2} RDV dans ma structure" },
    ],
  },
  {
    groupe: "Pièces manquantes",
    items: [
      { value: "attente_pieces_menage", label: "\u{1F4C4} Attente pièces (ménage)" },
      { value: "attente_photos", label: "\u{1F4F7} Attente photo(s)" },
      { value: "attente_infos_complementaires", label: "ℹ️ Attente infos complémentaires" },
      { value: "complements_ddt", label: "➕ Compléments demandés par la DDT" },
    ],
  },
  {
    groupe: "Éligibilité",
    items: [
      { value: "semble_eligible_a_confirmer", label: "✅ Semble éligible - à confirmer" },
      { value: "ne_semble_pas_eligible_a_confirmer", label: "❌ Ne semble pas éligible - à confirmer" },
    ],
  },
  {
    groupe: "Expert",
    items: [
      { value: "expert_rdv_a_planifier", label: "\u{1F9D1} Expert : RDV à planifier" },
      { value: "expert_transmission", label: "\u{1F9D1} Expert : transmission" },
      { value: "expert_devis_recu", label: "\u{1F9D1} Expert : devis reçu" },
      { value: "expert_rdv_1", label: "\u{1F9D1} Expert : RDV n°1" },
      { value: "expert_rdv_2", label: "\u{1F9D1} Expert : RDV n°2" },
      { value: "expert_attente_retour", label: "\u{1F9D1} Expert : attente retour" },
    ],
  },
  {
    groupe: "Autre",
    items: [{ value: ACTION_TYPE_AUTRE, label: "Autre" }],
  },
] as const;

/** Union de toutes les valeurs de type d'action */
export type ActionType = (typeof ACTION_TYPE_GROUPS)[number]["items"][number]["value"];

/** Lookup label par valeur de type d'action */
export const ACTION_LABELS_BY_VALUE: Record<string, string> = ACTION_TYPE_GROUPS.reduce(
  (acc, group) => {
    for (const item of group.items) {
      acc[item.value] = item.label;
    }
    return acc;
  },
  // Types système hors formulaire : pas dans ACTION_TYPE_GROUPS, mais affichables dans l'historique.
  {
    [ACTION_TYPE_DOSSIER_REOUVERT]: "Demande ré-ouverte",
    [ACTION_TYPE_INVITATION_RENVOYEE]: "Invitation renvoyée",
    [ACTION_TYPE_ACCOMPAGNEMENT_ARRETE]: "Arrêt de l'accompagnement",
    [ACTION_TYPE_ARRET_DEMANDE]: "Demande d'arrêt de l'accompagnement",
    [ACTION_TYPE_ARRET_REFUSE]: "Refus de l'arrêt de l'accompagnement",
  } as Record<string, string>
);

/** Liste plate de toutes les valeurs de type d'action (pour validation) */
export const ACTION_TYPE_VALUES: string[] = ACTION_TYPE_GROUPS.flatMap((g) => g.items.map((i) => i.value));

/**
 * Détails d'une action avec informations de l'agent auteur (pour affichage)
 */
export interface ActionDetail {
  id: string;
  parcoursId: string;
  actionType: string;
  actionPrecision: string | null;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  agent: {
    id: string | null; // null si l'agent a été supprimé
    givenName: string;
    usualName: string | null;
    role: string | null;
    structureType: StructureType;
    structureName: string | null;
  };
}

/**
 * Données du formulaire de création/édition d'une action
 */
export interface ActionFormData {
  actionType: string;
  message?: string;
  actionPrecision?: string;
}

/**
 * Résultat de la création d'une action
 */
export interface CreateActionResult {
  success: boolean;
  action?: ActionDetail;
  error?: string;
}

/**
 * Résultat de la mise à jour d'une action
 */
export interface UpdateActionResult {
  success: boolean;
  action?: ActionDetail;
  error?: string;
}

/**
 * Résultat de la suppression d'une action
 */
export interface DeleteActionResult {
  success: boolean;
  error?: string;
}

/**
 * Liste d'actions pour un parcours
 */
export interface ActionsListResult {
  actions: ActionDetail[];
  totalCount: number;
  currentAgentId?: string;
}
