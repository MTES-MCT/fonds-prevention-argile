import { getServerEnv } from "@/shared/config/env.config";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { getEffectiveRGAData } from "@/features/parcours/core/services/rga-data.service";
import { graphqlClient } from "../adapters/graphql/client";
import {
  contenuSansDate,
  controlerAvisImpot,
  doitControlerAvisImpot,
  formaterDetailControle,
  type ResultatControleAvisImpot,
} from "../domain/avis-impot";
import { estControleAvisImpotActive, getAnnotationControleAvisImpot } from "../domain/value-objects/ds-annotations";
import { lireAvisImpotDossier } from "./avis-impot.service";
import { enregistrerControleAvisImpot } from "./dossier-ds.service";

export type IssueAnnotationControle = "ecrite" | "inchangee" | "simulation" | "annotation_non_configuree";

export interface ControleAvisImpotDossier {
  numero: number;
  resultat: ResultatControleAvisImpot;
  champsModifiesAt: string | null;
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
  const controle = { numero, resultat, texte, champsModifiesAt: donnees.champsModifiesAt };

  const annotationId = donnees.demarcheNumero ? getAnnotationControleAvisImpot(donnees.demarcheNumero) : null;
  if (!annotationId) return { ...controle, issue: "annotation_non_configuree" };
  // Chaque écriture s'inscrit dans l'historique DN du dossier : on n'y ajoute pas de bruit.
  if (contenuSansDate(donnees.annotations[annotationId] ?? null) === contenuSansDate(texte)) {
    return { ...controle, issue: "inchangee" };
  }
  if (!options.appliquer) return { ...controle, issue: "simulation" };

  await graphqlClient.modifierAnnotations({
    dossierId: donnees.dossierId,
    instructeurId: getServerEnv().DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID,
    annotations: [{ id: annotationId, value: { textarea: texte } }],
  });
  return { ...controle, issue: "ecrite" };
}

export interface DossierApresSync {
  id: string;
  step: Step;
  dsNumber: string | null;
  dsDemarcheId: string;
  avisImpotControleAt: Date | null;
  avisImpotChampsModifiesAt: Date | null;
}

type ParcoursAvecSimulation = Parameters<typeof getEffectiveRGAData>[0];

/**
 * Contrôle, écrit l'annotation et enregistre le verdict en base. Rien n'est enregistré sans
 * écriture effective (ou déjà à jour), pour qu'un échec soit retenté au passage suivant.
 */
export async function controlerEtEnregistrerAvisImpot(params: {
  parcours: ParcoursAvecSimulation;
  dossierId: string;
  dsNumber: string;
  appliquer: boolean;
  maintenant?: Date;
}): Promise<ControleAvisImpotDossier | null> {
  const maintenant = params.maintenant ?? new Date();
  const controle = await controlerEtAnnoterAvisImpot(Number(params.dsNumber), {
    codeRegion: getEffectiveRGAData(params.parcours)?.logement?.code_region ?? null,
    appliquer: params.appliquer,
    maintenant,
  });
  if (controle && params.appliquer && (controle.issue === "ecrite" || controle.issue === "inchangee")) {
    await enregistrerControleAvisImpot(params.dossierId, {
      statut: controle.resultat.statut,
      controleAt: maintenant,
      champsModifiesAt: controle.champsModifiesAt ? new Date(controle.champsModifiesAt) : null,
    });
  }
  return controle;
}

/**
 * Appelé par le CRON après la sync d'un dossier. Renvoie null quand aucun contrôle n'était dû ;
 * une erreur DN remonte à l'appelant, qui la trace dans l'historique du run.
 */
export async function controlerAvisImpotApresSync(params: {
  parcours: ParcoursAvecSimulation;
  dossier: DossierApresSync;
  dsStatus: DSStatus | null;
  champsModifiesAt: string | undefined;
  maintenant?: Date;
}): Promise<IssueAnnotationControle | null> {
  const { parcours, dossier, dsStatus, champsModifiesAt } = params;
  const aControler = doitControlerAvisImpot({
    step: dossier.step,
    dsStatus,
    controleAt: dossier.avisImpotControleAt,
    champsModifiesAtControle: dossier.avisImpotChampsModifiesAt,
    champsModifiesAtDn: champsModifiesAt,
  });
  if (!aControler || !dossier.dsNumber || !estControleAvisImpotActive(Number(dossier.dsDemarcheId))) return null;

  const controle = await controlerEtEnregistrerAvisImpot({
    parcours,
    dossierId: dossier.id,
    dsNumber: dossier.dsNumber,
    appliquer: true,
    maintenant: params.maintenant,
  });
  return controle?.issue ?? null;
}
