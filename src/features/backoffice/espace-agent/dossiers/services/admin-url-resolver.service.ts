import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { getServerEnv } from "@/shared/config/env.config";

/**
 * Résout l'URL de suivi du dossier dans l'espace agent, pour le conseiller (AMO ou
 * Aller-vers) responsable. Reproduit la même règle que le lien calculé côté listing
 * (`DossiersSuivisTable`), en un seul endroit — source de vérité pour toute surface
 * qui a besoin de ce lien (ex. synchro Brevo) :
 *  - pas de validation AMO -> page prospect (Aller-vers, avant tout accompagnement AMO) ;
 *  - validation en attente sur une entreprise AMO réelle (pas SANS_AMO), dossier non
 *    archivé -> page de demande (action requise côté AMO) ;
 *  - sinon (validée/refusée/SANS_AMO/archivée) -> page de suivi du dossier.
 *
 * `null` si le parcours n'existe pas.
 */
export async function resolveAdminUrl(parcoursId: string): Promise<string | null> {
  const [parcours] = await db
    .select({ id: parcoursPrevention.id, archivedAt: parcoursPrevention.archivedAt })
    .from(parcoursPrevention)
    .where(eq(parcoursPrevention.id, parcoursId))
    .limit(1);
  if (!parcours) return null;

  const baseUrl = getServerEnv().BASE_URL;

  const [validation] = await db
    .select({
      id: parcoursAmoValidations.id,
      statut: parcoursAmoValidations.statut,
      entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId,
    })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);

  if (!validation) {
    return `${baseUrl}${ROUTES.backoffice.espaceAmo.prospect(parcours.id)}`;
  }

  const isDemandeEnAttente =
    validation.statut === StatutValidationAmo.EN_ATTENTE && !!validation.entrepriseAmoId && !parcours.archivedAt;

  return isDemandeEnAttente
    ? `${baseUrl}${ROUTES.backoffice.espaceAmo.demande(validation.id)}`
    : `${baseUrl}${ROUTES.backoffice.espaceAmo.dossier(validation.id)}`;
}
