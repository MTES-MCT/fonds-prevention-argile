import { eq, like, or, and } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  entreprisesAmo,
  entreprisesAmoCommunes,
  parcoursAmoValidations,
  parcoursPrevention,
} from "@/shared/database/schema";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../utils/amo.utils";
import { Amo } from "../domain/entities";
import { StatutValidationAmo } from "../domain/value-objects";

/**
 * Service de requêtes lecture seule pour les AMO
 */

/**
 * Récupère les AMO disponibles pour un code INSEE
 */
export async function getAmosForCodeInsee(userId: string): Promise<Amo[]> {
  // Récupérer le code INSEE depuis le parcours
  const [parcours] = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
    })
    .from(parcoursPrevention)
    .where(eq(parcoursPrevention.userId, userId))
    .limit(1);

  const codeInsee = normalizeCodeInsee(
    parcours?.rgaSimulationData?.logement?.commune
  );

  if (!codeInsee) {
    throw new Error("Simulation RGA non complétée (code INSEE manquant)");
  }

  // Extraire le code département
  const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);

  // 1. AMO avec le code INSEE spécifique
  const amosParCodeInsee = await db
    .selectDistinct({
      id: entreprisesAmo.id,
      nom: entreprisesAmo.nom,
      siret: entreprisesAmo.siret,
      departements: entreprisesAmo.departements,
      emails: entreprisesAmo.emails,
      telephone: entreprisesAmo.telephone,
      adresse: entreprisesAmo.adresse,
    })
    .from(entreprisesAmo)
    .innerJoin(
      entreprisesAmoCommunes,
      eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
    )
    .where(eq(entreprisesAmoCommunes.codeInsee, codeInsee));

  // 2. AMO qui couvrent le département entier
  const amosParDepartement = await db
    .select({
      id: entreprisesAmo.id,
      nom: entreprisesAmo.nom,
      siret: entreprisesAmo.siret,
      departements: entreprisesAmo.departements,
      emails: entreprisesAmo.emails,
      telephone: entreprisesAmo.telephone,
      adresse: entreprisesAmo.adresse,
    })
    .from(entreprisesAmo)
    .where(like(entreprisesAmo.departements, `%${codeDepartement}%`));

  // Fusionner et dédupliquer par ID
  const amosMap = new Map<string, Amo>();

  for (const amo of [...amosParCodeInsee, ...amosParDepartement]) {
    if (!amosMap.has(amo.id)) {
      amosMap.set(amo.id, amo);
    }
  }

  return Array.from(amosMap.values());
}

/**
 * Récupère tous les AMO avec leurs communes (admin)
 */
export async function getAllAmosWithCommunes(): Promise<
  Array<Amo & { communes: { codeInsee: string }[] }>
> {
  const allAmosWithCommunes = await db
    .select({
      id: entreprisesAmo.id,
      nom: entreprisesAmo.nom,
      siret: entreprisesAmo.siret,
      departements: entreprisesAmo.departements,
      emails: entreprisesAmo.emails,
      telephone: entreprisesAmo.telephone,
      adresse: entreprisesAmo.adresse,
      codeInsee: entreprisesAmoCommunes.codeInsee,
    })
    .from(entreprisesAmo)
    .leftJoin(
      entreprisesAmoCommunes,
      eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
    )
    .orderBy(entreprisesAmo.nom);

  // Grouper les codes INSEE par AMO
  const amosMap = new Map<
    string,
    Amo & { communes: { codeInsee: string }[] }
  >();

  for (const row of allAmosWithCommunes) {
    if (!amosMap.has(row.id)) {
      amosMap.set(row.id, {
        id: row.id,
        nom: row.nom,
        siret: row.siret,
        departements: row.departements,
        emails: row.emails,
        telephone: row.telephone,
        adresse: row.adresse,
        communes: [],
      });
    }

    const amo = amosMap.get(row.id);
    if (amo && row.codeInsee) {
      amo.communes.push({ codeInsee: row.codeInsee });
    }
  }

  return Array.from(amosMap.values());
}

/**
 * Récupère l'AMO sélectionnée par l'utilisateur
 */
export async function getUserSelectedAmo(userId: string): Promise<Amo | null> {
  // Récupérer le parcours
  const [parcours] = await db
    .select({ id: parcoursPrevention.id })
    .from(parcoursPrevention)
    .where(eq(parcoursPrevention.userId, userId))
    .limit(1);

  if (!parcours) {
    throw new Error("Parcours non trouvé");
  }

  // Récupérer l'AMO choisie
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
    .innerJoin(
      entreprisesAmo,
      eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id)
    )
    .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
    .limit(1);

  return amoChoisie || null;
}

/**
 * Récupère l'AMO qui a refusé l'accompagnement
 */
export async function getUserRejectedAmo(
  userId: string
): Promise<{ id: string; nom: string } | null> {
  // Récupérer le parcours
  const [parcours] = await db
    .select({ id: parcoursPrevention.id })
    .from(parcoursPrevention)
    .where(eq(parcoursPrevention.userId, userId))
    .limit(1);

  if (!parcours) {
    throw new Error("Parcours non trouvé");
  }

  // Récupérer l'AMO refusée
  const [amoRefusee] = await db
    .select({
      id: entreprisesAmo.id,
      nom: entreprisesAmo.nom,
    })
    .from(parcoursAmoValidations)
    .innerJoin(
      entreprisesAmo,
      eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id)
    )
    .where(
      and(
        eq(parcoursAmoValidations.parcoursId, parcours.id),
        eq(
          parcoursAmoValidations.statut,
          StatutValidationAmo.ACCOMPAGNEMENT_REFUSE
        )
      )
    )
    .limit(1);

  return amoRefusee || null;
}

/**
 * Récupère une AMO par son ID
 */
export async function getAmoById(amoId: string): Promise<Amo | null> {
  const [amo] = await db
    .select({
      id: entreprisesAmo.id,
      nom: entreprisesAmo.nom,
      siret: entreprisesAmo.siret,
      departements: entreprisesAmo.departements,
      emails: entreprisesAmo.emails,
      telephone: entreprisesAmo.telephone,
      adresse: entreprisesAmo.adresse,
    })
    .from(entreprisesAmo)
    .where(eq(entreprisesAmo.id, amoId))
    .limit(1);

  return amo || null;
}

/**
 * Vérifie qu'un AMO couvre un code INSEE
 */
export async function checkAmoCoversCodeInsee(
  amoId: string,
  codeInsee: string
): Promise<boolean> {
  const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);

  const result = await db
    .select({
      id: entreprisesAmo.id,
    })
    .from(entreprisesAmo)
    .leftJoin(
      entreprisesAmoCommunes,
      eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
    )
    .where(
      and(
        eq(entreprisesAmo.id, amoId),
        or(
          eq(entreprisesAmoCommunes.codeInsee, codeInsee),
          like(entreprisesAmo.departements, `%${codeDepartement}%`)
        )
      )
    )
    .limit(1);

  return result.length > 0;
}
