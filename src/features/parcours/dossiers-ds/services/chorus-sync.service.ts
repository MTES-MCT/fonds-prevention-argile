import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  dossiersDemarchesSimplifiees,
  type DossierDemarchesSimplifiees,
} from "@/shared/database/schema/dossiers-demarches-simplifiees";
import type { StatutsChorus } from "@/shared/domain/value-objects/bilan-annotations-dn";
import type { AnnotationLue } from "../adapters/graphql/types";
import { evaluerChorus } from "../domain/chorus-annotations";

/** Reporte le suivi Chorus saisi par la DDT dans DN. Renvoie le statut de chacune des trois valeurs, jamais leur contenu. */
export async function synchroniserChorus(
  dossier: DossierDemarchesSimplifiees,
  annotations: AnnotationLue[]
): Promise<StatutsChorus> {
  const { maj, statuts } = evaluerChorus(dossier, annotations, Number(dossier.dsDemarcheId), new Date());
  if (Object.keys(maj).length > 0) {
    await db.update(dossiersDemarchesSimplifiees).set(maj).where(eq(dossiersDemarchesSimplifiees.id, dossier.id));
  }
  return statuts;
}
