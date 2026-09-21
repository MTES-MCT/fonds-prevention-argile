import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  dossiersDemarchesSimplifiees,
  entreprisesAmo,
  parcoursAmoValidations,
  parcoursPrevention,
} from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import { asString } from "@/shared/utils";
import { estDossierChezLaDdt } from "@/features/parcours/amo/domain/value-objects";
import { AmoMode, resolveAmoModeForParcours } from "@/features/parcours/amo/domain/value-objects/departements-amo";
import {
  resoudreAmoARattacher,
  type OrigineRattachement,
} from "@/features/parcours/amo/services/rattachement-amo.service";

export interface DossierARattacher {
  parcoursId: string;
  demandeur: string;
  commune: string | null;
  dept: string;
  currentStep: Step;
  currentStatus: Status;
  /** AMO qui serait rattachée, et d'où elle vient. `null` = aucune trouvable sur le territoire. */
  amoCible: { nom: string; origine: OrigineRattachement } | null;
  /** Formulaire d'éligibilité déposé, décision non rendue : le rattachement est gelé. */
  gele: boolean;
}

/**
 * Parcours actifs en « sans AMO » sans entreprise, dans un département où l'AMO est obligatoire —
 * un état que seul un détachement a pu produire (ADR-0037). Source unique partagée par la page
 * diagnostics et `pnpm fix:rattacher-amo`, pour qu'ils ne comptent jamais des populations
 * différentes.
 *
 * Résout l'AMO cible ligne par ligne : l'écran doit montrer qui serait rattaché avant le clic.
 */
export async function listerDossiersARattacher(parcoursId?: string): Promise<DossierARattacher[]> {
  const rows = await db
    .select({
      id: parcoursPrevention.id,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
      userNom: parcoursAmoValidations.userNom,
      userPrenom: parcoursAmoValidations.userPrenom,
      eligibiliteDsStatus: dossiersDemarchesSimplifiees.dsStatus,
    })
    .from(parcoursPrevention)
    .innerJoin(parcoursAmoValidations, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
    .leftJoin(
      dossiersDemarchesSimplifiees,
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id),
        eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE)
      )
    )
    .where(
      and(
        eq(parcoursAmoValidations.statut, StatutValidationAmo.SANS_AMO),
        isNull(parcoursAmoValidations.entrepriseAmoId),
        isNull(parcoursPrevention.archivedAt),
        isNull(parcoursPrevention.completedAt),
        parcoursId ? eq(parcoursPrevention.id, parcoursId) : undefined
      )
    );

  const dossiers: DossierARattacher[] = [];

  for (const row of rows) {
    // Le mode AMO dérive de la commune stockée en JSONB : filtrage côté JS (cf. CLAUDE.md).
    const mode = resolveAmoModeForParcours(row);
    if (mode === null || mode === AmoMode.FACULTATIF) continue;

    const logement = getDemandeurFirstLogement(row);
    const codeInsee = (asString(logement?.commune) ?? "").padStart(5, "0");
    const resolved = await resoudreAmoARattacher(row);
    const nomAmo = resolved === null ? null : await nomEntreprise(resolved.entrepriseAmoId);

    dossiers.push({
      parcoursId: row.id,
      demandeur: [row.userPrenom, row.userNom].filter(Boolean).join(" ") || "Demandeur inconnu",
      commune: asString(logement?.commune_nom) ?? null,
      dept: codeInsee.startsWith("97") || codeInsee.startsWith("98") ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2),
      currentStep: row.currentStep as Step,
      currentStatus: row.currentStatus as Status,
      amoCible: resolved && nomAmo ? { nom: nomAmo, origine: resolved.origine } : null,
      gele: estDossierChezLaDdt((row.eligibiliteDsStatus as DSStatus | null) ?? null),
    });
  }

  return dossiers.sort((a, b) => a.dept.localeCompare(b.dept) || a.demandeur.localeCompare(b.demandeur, "fr"));
}

async function nomEntreprise(id: string): Promise<string | null> {
  const [amo] = await db
    .select({ nom: entreprisesAmo.nom })
    .from(entreprisesAmo)
    .where(eq(entreprisesAmo.id, id))
    .limit(1);
  return amo?.nom ?? null;
}
