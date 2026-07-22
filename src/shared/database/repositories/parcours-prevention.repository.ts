import { eq, sql, SQL, desc, asc, and, isNull } from "drizzle-orm";
import { db } from "../client";
import { parcoursPrevention } from "../schema/parcours-prevention";
import { users } from "../schema/users";
import { parcoursAmoValidations } from "../schema/parcours-amo-validations";
import { dossiersDemarchesSimplifiees } from "../schema/dossiers-demarches-simplifiees";
import { BaseRepository, PaginationParams, PaginationResult } from "./base.repository";
import type { ParcoursPrevention, NewParcoursPrevention } from "../schema/parcours-prevention";
import { getNextStep, Status, Step } from "@/features/parcours/core";
import { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types";
import { getDemandeurFirstSimulation } from "@/shared/domain/utils/rga-simulation.utils";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

export class ParcoursPreventionRepository extends BaseRepository<ParcoursPrevention> {
  /**
   * Trouve un parcours par ID
   */
  async findById(id: string): Promise<ParcoursPrevention | null> {
    const result = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.id, id)).limit(1);

    return result[0] || null;
  }

  /**
   * Récupère tous les parcours
   */
  async findAll(): Promise<ParcoursPrevention[]> {
    return await db.select().from(parcoursPrevention).orderBy(desc(parcoursPrevention.createdAt));
  }

  /**
   * Crée un nouveau parcours
   */
  async create(data: NewParcoursPrevention): Promise<ParcoursPrevention> {
    const result = await db.insert(parcoursPrevention).values(data).returning();

    return result[0];
  }

  /**
   * Met à jour un parcours
   */
  async update(id: string, data: Partial<NewParcoursPrevention>): Promise<ParcoursPrevention | null> {
    const result = await db.update(parcoursPrevention).set(data).where(eq(parcoursPrevention.id, id)).returning();

    return result[0] || null;
  }

  /**
   * Supprime un parcours
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(parcoursPrevention).where(eq(parcoursPrevention.id, id)).returning();

    return result.length > 0;
  }

  /**
   * Vérifie si un parcours existe
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: parcoursPrevention.id })
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Compte le nombre de parcours
   */
  async count(where?: SQL): Promise<number> {
    const query = db.select({ count: sql<number>`cast(count(*) as integer)` }).from(parcoursPrevention);

    if (where) {
      query.where(where);
    }

    const result = await query;
    return result[0]?.count ?? 0;
  }

  /**
   * Trouve le parcours unique d'un utilisateur (un seul parcours par user)
   */
  async findByUserId(userId: string): Promise<ParcoursPrevention | null> {
    const result = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.userId, userId)).limit(1);

    return result[0] || null;
  }

  /**
   * Met à jour l'étape courante d'un parcours
   */
  async updateStep(id: string, step: Step, status: Status = Status.TODO): Promise<ParcoursPrevention | null> {
    return await this.update(id, {
      currentStep: step,
      currentStatus: status,
    });
  }

  /**
   * Met à jour le statut d'un parcours
   */
  async updateStatus(id: string, status: Status): Promise<ParcoursPrevention | null> {
    return await this.update(id, {
      currentStatus: status,
    });
  }

  /**
   * Marque un parcours comme complété.
   * Idempotent : si `completedAt` est déjà rempli, ne touche pas la valeur
   * existante (pour préserver le timestamp d'origine).
   */
  async markAsCompleted(id: string): Promise<ParcoursPrevention | null> {
    const result = await db
      .update(parcoursPrevention)
      .set({ completedAt: new Date() })
      .where(and(eq(parcoursPrevention.id, id), isNull(parcoursPrevention.completedAt)))
      .returning();

    if (result.length > 0) {
      return result[0];
    }
    // Déjà complété : on retourne la ligne telle quelle
    return await this.findById(id);
  }

  /**
   * Récupère les parcours avec pagination
   */
  async findWithPagination(params: PaginationParams = {}): Promise<PaginationResult<ParcoursPrevention>> {
    const { page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(parcoursPrevention)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(parcoursPrevention.createdAt));

    const total = await this.count();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Trouve les parcours actifs à synchroniser : ni archivés, ni complétés.
   * Utilisé par le CRON de synchronisation des dossiers DS.
   */
  async findActiveForSync(): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(and(isNull(parcoursPrevention.archivedAt), isNull(parcoursPrevention.completedAt)))
      .orderBy(asc(parcoursPrevention.createdAt));
  }

  /**
   * Trouve les parcours en instruction
   */
  async findInProgress(): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(eq(parcoursPrevention.currentStatus, Status.EN_INSTRUCTION))
      .orderBy(desc(parcoursPrevention.updatedAt));
  }

  /**
   * Trouve les parcours terminés
   */
  async findCompleted(): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(sql`${parcoursPrevention.completedAt} IS NOT NULL`)
      .orderBy(desc(parcoursPrevention.completedAt));
  }

  /**
   * Vérifie si l'utilisateur peut passer à l'étape suivante
   */
  async canProgressToNextStep(id: string): Promise<boolean> {
    const parcours = await this.findById(id);
    if (!parcours) return false;

    // Un parcours peut progresser si l'étape courante est validée
    return parcours.currentStatus === Status.VALIDE;
  }

  /**
   * Progresse vers l'étape suivante
   */
  async progressToNextStep(id: string): Promise<ParcoursPrevention | null> {
    const parcours = await this.findById(id);
    if (!parcours || !(await this.canProgressToNextStep(id))) {
      return null;
    }

    const nextStep = getNextStep(parcours.currentStep);

    // Si on est déjà à la dernière étape ou pas d'étape suivante
    if (!nextStep) {
      // Marquer comme complété si on valide la dernière étape
      if (parcours.currentStatus === Status.VALIDE && !parcours.completedAt) {
        return await this.markAsCompleted(id);
      }
      return parcours;
    }

    return await this.updateStep(id, nextStep, Status.TODO);
  }

  /**
   * Crée ou récupère le parcours unique d'un utilisateur.
   * `createdByAgentId` trace l'agent créateur (utile pour les dossiers
   * pré-créés par un Aller-vers).
   */
  async findOrCreateForUser(userId: string, opts?: { createdByAgentId?: string }): Promise<ParcoursPrevention> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return existing;
    }

    const initialStep = opts?.createdByAgentId ? Step.INVITATION : Step.CHOIX_AMO;

    return await this.create({
      userId,
      currentStep: initialStep,
      currentStatus: Status.TODO,
      createdByAgentId: opts?.createdByAgentId ?? null,
    });
  }

  /**
   * Marque l'invitation comme acceptée et fait progresser le parcours.
   *
   * - Si une validation AMO en `LOGEMENT_ELIGIBLE` existe déjà pour ce parcours
   *   (cas d'une invitation créée par un agent AMO avec simulation éligible) :
   *   l'AMO est déjà choisi+validé → on saute `CHOIX_AMO` et on va directement
   *   à `ELIGIBILITE/TODO`.
   * - Si une validation `LOGEMENT_NON_ELIGIBLE` existe : on reste sur `CHOIX_AMO`
   *   (le demandeur sera bloqué de toute façon par le statut AMO).
   * - Sinon (invitation AV sans validation AMO, ou AMO sans simulation) :
   *   transition standard vers `CHOIX_AMO/TODO`.
   *
   * Idempotent : ne fait rien si le parcours n'est plus à l'étape INVITATION.
   */
  async validateInvitation(parcoursId: string): Promise<ParcoursPrevention | null> {
    const parcours = await this.findById(parcoursId);
    if (!parcours || parcours.currentStep !== Step.INVITATION) {
      return parcours;
    }

    const [existingValidation] = await db
      .select({ statut: parcoursAmoValidations.statut })
      .from(parcoursAmoValidations)
      .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
      .limit(1);

    if (existingValidation?.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE) {
      // AMO déjà choisi+validé via l'invitation → on saute la sélection AMO.
      return await this.updateStep(parcoursId, Step.ELIGIBILITE, Status.TODO);
    }

    return await this.updateStep(parcoursId, Step.CHOIX_AMO, Status.TODO);
  }

  /**
   * Sauvegarde les données RGA du simulateur dans le parcours
   */
  async updateRGAData(parcoursId: string, rgaData: RGASimulationData): Promise<ParcoursPrevention | null> {
    return await this.update(parcoursId, {
      rgaSimulationData: rgaData,
      rgaSimulationCompletedAt: new Date(),
    });
  }

  /**
   * Récupère tous les parcours ayant des données RGA (pour dashboard admin)
   */
  async findParcoursWithRGAData(): Promise<ParcoursPrevention[]> {
    return await db
      .select()
      .from(parcoursPrevention)
      .where(sql`${parcoursPrevention.rgaSimulationData} IS NOT NULL`)
      .orderBy(desc(parcoursPrevention.rgaSimulationCompletedAt));
  }

  /**
   * Compte le nombre de parcours avec données RGA
   */
  async countWithRGAData(): Promise<number> {
    return await this.count(sql`${parcoursPrevention.rgaSimulationData} IS NOT NULL`);
  }

  /**
   * Vérifie si un parcours a des données RGA
   */
  async hasRGAData(parcoursId: string): Promise<boolean> {
    const parcours = await this.findById(parcoursId);
    return parcours?.rgaSimulationData !== null && parcours?.rgaSimulationData !== undefined;
  }

  /**
   * Met à jour la situation du particulier
   */
  async updateSituationParticulier(
    id: string,
    situation: SituationParticulier,
    archiveReason?: string,
    archivedByAgentId?: string
  ): Promise<ParcoursPrevention | null> {
    const updateData: Partial<NewParcoursPrevention> = {
      situationParticulier: situation,
    };

    if (situation === SituationParticulier.ARCHIVE) {
      updateData.archivedAt = new Date();
      if (archiveReason) {
        updateData.archiveReason = archiveReason;
      }
      if (archivedByAgentId) {
        updateData.archivedBy = archivedByAgentId;
      }
    } else {
      // Réactivation : nettoyer les champs d'archivage
      updateData.archivedAt = null;
      updateData.archiveReason = null;
      updateData.archivedBy = null;
    }

    return await this.update(id, updateData);
  }

  /**
   * Sauvegarde les données RGA éditées par un agent (AMO ou allers-vers).
   * Accepte un objet partiel : une simulation agent coupée par un early exit
   * non éligible n'a pas tous les champs (les lecteurs downstream chaînent en optionnel).
   */
  async updateRGADataAgent(
    parcoursId: string,
    rgaData: RGASimulationData | PartialRGASimulationData,
    agentId: string,
    opts?: { baseline?: RGASimulationData | PartialRGASimulationData | null }
  ): Promise<ParcoursPrevention | null> {
    const updateData: Partial<NewParcoursPrevention> = {
      rgaSimulationDataAgent: rgaData as RGASimulationData,
      rgaSimulationAgentEditedAt: new Date(),
      rgaSimulationAgentEditedBy: agentId,
    };
    // Snapshot d'origine (1re correction) pour le diff du détail dossier. Écrit
    // seulement si un baseline est fourni ; la création ne le pose pas (null).
    if (opts?.baseline !== undefined) {
      updateData.rgaSimulationDataAgentBaseline = (opts.baseline as RGASimulationData) ?? null;
    }
    return await this.update(parcoursId, updateData);
  }

  /**
   * Récupère tous les parcours (avec ou sans validation AMO) d'un territoire.
   * Filtrage territorial fait côté JS via `getDemandeurFirstSimulation` (fallback
   * agent-edited si le demandeur n'a pas simulé).
   */
  async getParcoursByTerritoire(
    departements: string[],
    epcis: string[] = [],
    filters?: {
      step?: Step;
      search?: string;
    }
  ) {
    const conditions: SQL[] = [];
    if (filters?.step) {
      conditions.push(eq(parcoursPrevention.currentStep, filters.step));
    }
    if (filters?.search) {
      conditions.push(
        sql`(LOWER(${users.prenom}) LIKE LOWER(${"%" + filters.search + "%"}) OR LOWER(${users.nom}) LIKE LOWER(${"%" + filters.search + "%"}))`
      );
    }

    const results = await db
      .select({
        parcoursId: parcoursPrevention.id,
        userId: parcoursPrevention.userId,
        situationParticulier: parcoursPrevention.situationParticulier,
        currentStep: parcoursPrevention.currentStep,
        currentStatus: parcoursPrevention.currentStatus,
        createdAt: parcoursPrevention.createdAt,
        updatedAt: parcoursPrevention.updatedAt,
        archivedAt: parcoursPrevention.archivedAt,
        createdByAgentId: parcoursPrevention.createdByAgentId,
        rgaSimulationData: parcoursPrevention.rgaSimulationData,
        rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
        // Utilisateur
        userPrenom: users.prenom,
        userNom: users.nom,
        userEmail: users.email,
        userTelephone: users.telephone,
        // Validation AMO (null si dossier sans AMO)
        validationId: parcoursAmoValidations.id,
        validationStatut: parcoursAmoValidations.statut,
        entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId,
        validationChoisieAt: parcoursAmoValidations.choisieAt,
        validationValideeAt: parcoursAmoValidations.valideeAt,
        // Dossier DS de l'étape courante (null si absent)
        dsStatus: dossiersDemarchesSimplifiees.dsStatus,
        dossierCreatedAt: dossiersDemarchesSimplifiees.createdAt,
        submittedAt: dossiersDemarchesSimplifiees.submittedAt,
        instructedAt: dossiersDemarchesSimplifiees.instructedAt,
      })
      .from(parcoursPrevention)
      .innerJoin(users, eq(parcoursPrevention.userId, users.id))
      .leftJoin(parcoursAmoValidations, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .leftJoin(
        dossiersDemarchesSimplifiees,
        and(
          eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id),
          eq(dossiersDemarchesSimplifiees.step, parcoursPrevention.currentStep)
        )
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      // Tri secondaire sur le dossier DS : sans unicité (parcours_id, step), le dédup ci-dessous
      // doit garder la ligne DS la plus récente (dates / dsStatus cohérents), pas une au hasard.
      .orderBy(desc(parcoursPrevention.updatedAt), desc(dossiersDemarchesSimplifiees.updatedAt));

    const territoire = results.filter((r) => matchesTerritoire(getDemandeurFirstSimulation(r), departements, epcis));

    // Dédup par parcoursId : le LEFT JOIN dossiers DS peut produire plusieurs lignes
    // par parcours (pas d'unicité sur (parcours_id, step)). Garde la plus récente.
    const seen = new Set<string>();
    return territoire.filter((r) => {
      if (seen.has(r.parcoursId)) return false;
      seen.add(r.parcoursId);
      return true;
    });
  }

  // Dérive du listing pour que le badge égale « Tous les dossiers » (archivés compris).
  async countParcoursByTerritoire(departements: string[], epcis: string[] = []): Promise<number> {
    const rows = await this.getParcoursByTerritoire(departements, epcis);
    return rows.length;
  }
}

/**
 * Vérifie si un parcours est inclus dans le territoire d'un agent.
 *
 * Sémantique : union EPCI ∪ département.
 * Un parcours match dès que son département OU son EPCI est dans le scope.
 * Sans données de localisation, il n'est inclus que si aucun filtre territorial
 * n'est spécifié.
 */
export function matchesTerritoire(
  rgaSimulationData: RGASimulationData | null,
  departements: string[],
  epcis: string[]
): boolean {
  const hasFiltreTerritorial = departements.length > 0 || epcis.length > 0;
  const logement = rgaSimulationData?.logement;

  if (!logement) {
    return !hasFiltreTerritorial;
  }

  if (!hasFiltreTerritorial) {
    return true;
  }

  // Conversion en string : JSONB peut retourner un number (ex: 59 au lieu de "59")
  const matchDept =
    departements.length > 0 && !!logement.code_departement && departements.includes(String(logement.code_departement));
  const matchEpci = epcis.length > 0 && !!logement.epci && epcis.includes(String(logement.epci));

  return matchDept || matchEpci;
}

// Export d'une instance singleton
export const parcoursPreventionRepository = new ParcoursPreventionRepository();
