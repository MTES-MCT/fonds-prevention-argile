import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  dossiersDemarchesSimplifiees,
  type DossierDemarchesSimplifiees,
} from "@/shared/database/schema/dossiers-demarches-simplifiees";
import type { ChorusReporte } from "@/shared/domain/value-objects/bilan-annotations-dn";
import type { AnnotationLue } from "../adapters/graphql/types";
import { calculerMajChorus } from "../domain/chorus-annotations";

const NOMS_CHORUS: Record<string, ChorusReporte> = {
  chorusTiersFournisseur: "tiersFournisseur",
  chorusNumeroEj: "numeroEj",
  chorusMontantSubvention: "montantSubvention",
};

/** Reporte le suivi Chorus saisi par la DDT dans DN. Renvoie les valeurs qui ont changé, par nom. */
export async function synchroniserChorus(
  dossier: DossierDemarchesSimplifiees,
  annotations: AnnotationLue[]
): Promise<ChorusReporte[]> {
  const maj = calculerMajChorus(dossier, annotations, Number(dossier.dsDemarcheId), new Date());
  const reportes = Object.keys(maj)
    .map((colonne) => NOMS_CHORUS[colonne])
    .filter((nom): nom is ChorusReporte => nom !== undefined);
  if (reportes.length === 0) return [];

  await db.update(dossiersDemarchesSimplifiees).set(maj).where(eq(dossiersDemarchesSimplifiees.id, dossier.id));
  return reportes;
}
