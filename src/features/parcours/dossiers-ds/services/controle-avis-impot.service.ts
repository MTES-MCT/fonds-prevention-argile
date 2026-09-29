import { getServerEnv } from "@/shared/config/env.config";
import { graphqlClient } from "../adapters/graphql/client";
import {
  contenuSansDate,
  controlerAvisImpot,
  formaterDetailControle,
  type ResultatControleAvisImpot,
} from "../domain/avis-impot";
import { getAnnotationControleAvisImpot } from "../domain/value-objects/ds-annotations";
import { lireAvisImpotDossier } from "./avis-impot.service";

export type IssueAnnotationControle =
  "ecrite" | "inchangee" | "simulation" | "annotation_non_configuree" | "instructeur_non_configure";

export interface ControleAvisImpotDossier {
  numero: number;
  resultat: ResultatControleAvisImpot;
  /** Texte de l'annotation : contient des montants, ne jamais le journaliser. */
  texte: string;
  issue: IssueAnnotationControle;
}

export interface OptionsControleAvisImpot {
  codeRegion: string | null;
  /** Faux : calcule le verdict sans rien écrire dans DN. */
  appliquer: boolean;
  maintenant?: Date;
}

export async function controlerEtAnnoterAvisImpot(
  numero: number,
  options: OptionsControleAvisImpot
): Promise<ControleAvisImpotDossier | null> {
  const donnees = await lireAvisImpotDossier(numero);
  if (!donnees) return null;

  const maintenant = options.maintenant ?? new Date();
  const resultat = controlerAvisImpot(donnees, { codeRegion: options.codeRegion, maintenant });
  const texte = formaterDetailControle(resultat, maintenant);
  const controle = { numero, resultat, texte };

  const annotationId = donnees.demarcheNumero ? getAnnotationControleAvisImpot(donnees.demarcheNumero) : null;
  if (!annotationId) return { ...controle, issue: "annotation_non_configuree" };
  // Chaque écriture s'inscrit dans l'historique DN du dossier : on n'y ajoute pas de bruit.
  if (contenuSansDate(donnees.annotations[annotationId] ?? null) === contenuSansDate(texte)) {
    return { ...controle, issue: "inchangee" };
  }
  if (!options.appliquer) return { ...controle, issue: "simulation" };

  const instructeurId = getServerEnv().DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID;
  if (!instructeurId) return { ...controle, issue: "instructeur_non_configure" };

  await graphqlClient.modifierAnnotations({
    dossierId: donnees.dossierId,
    instructeurId,
    annotations: [{ id: annotationId, value: { textarea: texte } }],
  });
  return { ...controle, issue: "ecrite" };
}
