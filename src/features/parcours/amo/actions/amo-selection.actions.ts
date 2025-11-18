"use server";

import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { ActionResult } from "@/shared/types/action-result.types";
import { db } from "@/shared/database/client";
import {
  amoValidationTokens,
  entreprisesAmo,
  entreprisesAmoCommunes,
  entreprisesAmoEpci,
  parcoursAmoValidations,
  users,
} from "@/shared/database/schema";
import { and, eq, like, or } from "drizzle-orm";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../utils/amo.utils";
import { AMO_VALIDATION_TOKEN_VALIDITY_DAYS, StatutValidationAmo } from "../domain/value-objects";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { Amo } from "../domain/entities";
import { Status, Step } from "../../core";

/**
 * Choisir un AMO pour le parcours (étape CHOIX_AMO)
 * Crée ou met à jour une entrée dans parcoursAmoValidations
 * Ajoute les données personnelles temporaires (supprimées après validation)
 * Génère un token de validation sécurisé
 * Passe le parcours en EN_INSTRUCTION (en attente de validation AMO)
 * Envoi un mail à l'AMO
 */
export async function choisirAmo(params: {
  entrepriseAmoId: string;
  userPrenom: string;
  userNom: string;
  adresseLogement: string;
  email: string;
  telephone: string;
}): Promise<ActionResult<{ message: string; token: string }>> {
  try {
    const { entrepriseAmoId, userPrenom, userNom, adresseLogement, email, telephone } = params;

    // Validation des données personnelles
    if (!userPrenom?.trim()) {
      return { success: false, error: "Le prénom est requis" };
    }
    if (!userNom?.trim()) {
      return { success: false, error: "Le nom est requis" };
    }
    if (!adresseLogement?.trim()) {
      return { success: false, error: "L'adresse du logement est requise" };
    }
    if (!email?.trim()) {
      return { success: false, error: "L'email est requis" };
    }
    if (!telephone?.trim()) {
      return { success: false, error: "Le téléphone est requis" };
    }

    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    // Récupérer le parcours de l'utilisateur
    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    // Vérifier qu'on est bien à l'étape CHOIX_AMO
    if (parcours.currentStep !== Step.CHOIX_AMO) {
      return {
        success: false,
        error: "Vous n'êtes pas à l'étape de choix de l'AMO",
      };
    }

    if (!parcours?.rgaSimulationData?.logement?.commune) {
      return {
        success: false,
        error: "Simulation RGA non complétée (code INSEE manquant)",
      };
    }

    const codeInsee = normalizeCodeInsee(parcours?.rgaSimulationData?.logement?.commune);

    if (!codeInsee) {
      return {
        success: false,
        error: "Simulation RGA non complétée (code INSEE invalide)",
      };
    }

    // Extraire le code département
    const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);

    // Extraire le code EPCI (si disponible)
    const codeEpci = parcours?.rgaSimulationData?.logement?.epci
      ? String(parcours.rgaSimulationData.logement.epci).trim()
      : null;

    // Vérifier que l'AMO couvre le territoire selon la hiérarchie : EPCI > INSEE > Département
    const amoValide = await db
      .select({
        id: entreprisesAmo.id,
        departements: entreprisesAmo.departements,
      })
      .from(entreprisesAmo)
      .leftJoin(entreprisesAmoEpci, eq(entreprisesAmo.id, entreprisesAmoEpci.entrepriseAmoId))
      .leftJoin(entreprisesAmoCommunes, eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId))
      .where(
        and(
          eq(entreprisesAmo.id, entrepriseAmoId),
          or(
            // Priorité 1 : EPCI spécifique (si code EPCI disponible)
            codeEpci ? eq(entreprisesAmoEpci.codeEpci, codeEpci) : undefined,
            // Priorité 2 : Code INSEE spécifique
            eq(entreprisesAmoCommunes.codeInsee, codeInsee),
            // Priorité 3 : Département (fallback)
            like(entreprisesAmo.departements, `%${codeDepartement}%`)
          )
        )
      )
      .limit(1);

    if (amoValide.length === 0) {
      return {
        success: false,
        error: "Cette AMO ne couvre pas votre territoire (EPCI, commune ou département)",
      };
    }

    // Mettre à jour l'email et le téléphone de l'utilisateur
    await db
      .update(users)
      .set({
        email: email.trim(),
        telephone: telephone.trim(),
      })
      .where(eq(users.id, session.userId));

    // Créer ou mettre à jour la validation AMO
    const [validation] = await db
      .insert(parcoursAmoValidations)
      .values({
        parcoursId: parcours.id,
        entrepriseAmoId,
        statut: StatutValidationAmo.EN_ATTENTE,
        userPrenom: userPrenom.trim(),
        userNom: userNom.trim(),
        adresseLogement: adresseLogement.trim(),
      })
      .onConflictDoUpdate({
        target: parcoursAmoValidations.parcoursId,
        set: {
          entrepriseAmoId,
          statut: StatutValidationAmo.EN_ATTENTE,
          choisieAt: new Date(),
          valideeAt: null,
          commentaire: null,
          userPrenom: userPrenom.trim(),
          userNom: userNom.trim(),
          adresseLogement: adresseLogement.trim(),
        },
      })
      .returning();

    if (!validation) {
      return {
        success: false,
        error: "Erreur lors de la création de la validation",
      };
    }

    // Générer un token unique
    const token = crypto.randomUUID();

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + AMO_VALIDATION_TOKEN_VALIDITY_DAYS);

    // Créer le token de validation
    await db.insert(amoValidationTokens).values({
      parcoursAmoValidationId: validation.id,
      token,
      expiresAt,
    });

    // Récupérer les infos de l'AMO pour l'email
    const [amo] = await db
      .select({
        nom: entreprisesAmo.nom,
        emails: entreprisesAmo.emails,
      })
      .from(entreprisesAmo)
      .where(eq(entreprisesAmo.id, entrepriseAmoId))
      .limit(1);

    if (!amo) {
      return { success: false, error: "AMO non trouvée" };
    }

    // Envoyer l'email de validation à l'AMO
    const emailsList = amo.emails.split(";").map((e) => e.trim());

    const emailResult = await sendValidationAmoEmail({
      amoEmail: emailsList,
      amoNom: amo.nom,
      demandeurNom: userNom,
      demandeurPrenom: userPrenom,
      demandeurCodeInsee: codeInsee,
      adresseLogement,
      token,
    });

    if (!emailResult.success) {
      console.error("Erreur envoi email AMO:", emailResult.error);
      // On continue quand même, l'email n'est pas bloquant
    }

    // Passer le parcours en EN_INSTRUCTION (en attente de validation AMO)
    await parcoursRepo.updateStatus(parcours.id, Status.EN_INSTRUCTION);

    return {
      success: true,
      data: {
        message: "AMO sélectionnée avec succès",
        token,
      },
    };
  } catch (error) {
    console.error("Erreur choisirAmo:", error);
    return {
      success: false,
      error: "Erreur lors de la sélection de l'AMO",
    };
  }
}

/**
 * Récupérer uniquement les informations de l'AMO choisie pour le parcours de l'utilisateur
 * Plus léger que getValidationAmo car ne retourne que les infos de l'entreprise
 */
export async function getAmoChoisie(): Promise<ActionResult<Amo | null>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const [amoChoisie] = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(parcoursAmoValidations)
      .innerJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
      .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
      .limit(1);

    return {
      success: true,
      data: amoChoisie || null,
    };
  } catch (error) {
    console.error("Erreur getAmoChoisie:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'AMO",
    };
  }
}

/**
 * Récupérer uniquement l'id et le nom de l'AMO qui a refusé l'accompagnement
 */
export async function getAmoRefusee(): Promise<ActionResult<{ id: string; nom: string } | null>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    if (!parcours) {
      return { success: false, error: "Parcours non trouvé" };
    }

    const [amoRefusee] = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
      })
      .from(parcoursAmoValidations)
      .innerJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
      .where(
        and(
          eq(parcoursAmoValidations.parcoursId, parcours.id),
          eq(parcoursAmoValidations.statut, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE)
        )
      )
      .limit(1);

    return {
      success: true,
      data: amoRefusee || null,
    };
  } catch (error) {
    console.error("Erreur getAmoRefusee:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'AMO refusée",
    };
  }
}
