import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  dossiersDemarchesSimplifiees,
  type DossierDemarchesSimplifiees,
} from "@/shared/database/schema/dossiers-demarches-simplifiees";
import type { AnnotationLue } from "../adapters/graphql/types";
import { calculerMajChorus } from "../domain/chorus-annotations";

/** Reporte le suivi Chorus saisi par la DDT dans DN. Renvoie vrai si au moins une valeur a changé. */
export async function synchroniserChorus(
  dossier: DossierDemarchesSimplifiees,
  annotations: AnnotationLue[]
): Promise<boolean> {
  const maj = calculerMajChorus(dossier, annotations, Number(dossier.dsDemarcheId), new Date());
  if (Object.keys(maj).length === 0) return false;

  await db.update(dossiersDemarchesSimplifiees).set(maj).where(eq(dossiersDemarchesSimplifiees.id, dossier.id));
  return true;
}
