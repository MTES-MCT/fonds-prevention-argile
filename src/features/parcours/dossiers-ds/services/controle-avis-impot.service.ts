import { getServerEnv } from "@/shared/config/env.config";
import type { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { graphqlClient } from "../adapters/graphql/client";
import type { ValeurAnnotationDn } from "../adapters/graphql/types";
import {
  controlerAvisImpot,
  doitControlerAvisImpot,
  statutAnnotationControle,
  texteAnnotationControle,
  type ResultatControleAvisImpot,
} from "../domain/avis-impot";
import { calculerTrancheDossier, texteTauxSubvention, type TrancheDossier } from "../domain/tranche-revenu";
import { estInstructionAutomatiqueActive, idsAnnotationsInstruction } from "../domain/value-objects/ds-annotations";
import { lireAvisImpotDossier } from "./avis-impot.service";
import { enregistrerControleAvisImpot } from "./dossier-ds.service";

export type IssueAnnotationControle = "ecrite" | "inchangee" | "simulation" | "annotation_non_configuree";

export interface ControleAvisImpotDossier {
  numero: number;
  resultat: ResultatControleAvisImpot;
  tranche: TrancheDossier;
  champsModifiesAt: string | null;
  /** Texte de l'annotation de l'avis : une phrase métier, sans donnée fiscale. */
  texte: string;
  /** Valeur de chaque annotation répertoriée pour la démarche, écrite ou déjà à jour. */
  annotations: AnnotationInstruction[];
  issue: IssueAnnotationControle;
}

export interface AnnotationInstruction {
  nom: "Contrôle avis d'imposition" | "Type de ménage" | "Taux de subvention";
  id: string;
  valeur: string;
  value: ValeurAnnotationDn;
}

function annotationsInstruction(
  demarcheNumero: number | null,
  texteAvis: string,
  tranche: TrancheDossier
): AnnotationInstruction[] {
  if (!demarcheNumero) return [];
  const ids = idsAnnotationsInstruction(demarcheNumero);
  const taux = texteTauxSubvention(tranche);
  const candidates: Array<AnnotationInstruction | null> = [
    ids.avisImpot
      ? { nom: "Contrôle avis d'imposition", id: ids.avisImpot, valeur: texteAvis, value: { textarea: texteAvis } }
      : null,
    ids.typeMenage
      ? {
          nom: "Type de ménage",
          id: ids.typeMenage,
          valeur: tranche.typeMenage,
          value: { dropDownList: tranche.typeMenage },
        }
      : null,
    ids.tauxSubvention
      ? { nom: "Taux de subvention", id: ids.tauxSubvention, valeur: taux, value: { text: taux } }
      : null,
  ];
  return candidates.filter((a): a is AnnotationInstruction => a !== null);
}

export interface OptionsControleAvisImpot {
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
  const resultat = controlerAvisImpot(donnees, { maintenant });
  // RFR déclaré, pas celui de l'avis : la DDT instruit sur le formulaire, l'écart est signalé à part.
  const tranche = calculerTrancheDossier({
    revenuFiscalReference: donnees.declaratif.revenuFiscalReference,
    nombrePersonnes: donnees.declaratif.nombrePersonnes,
    codeDepartement: donnees.codeDepartement,
  });
  const texte = texteAnnotationControle(resultat);
  const annotations = annotationsInstruction(donnees.demarcheNumero, texte, tranche);
  const controle = { numero, resultat, tranche, texte, annotations, champsModifiesAt: donnees.champsModifiesAt };

  if (annotations.length === 0) return { ...controle, issue: "annotation_non_configuree" };
  // Chaque écriture s'inscrit dans l'historique DN du dossier : on n'y ajoute pas de bruit.
  const aEcrire = annotations.filter((a) => donnees.annotations[a.id] !== a.valeur);
  if (aEcrire.length === 0) return { ...controle, issue: "inchangee" };
  if (!options.appliquer) return { ...controle, issue: "simulation" };

  await graphqlClient.modifierAnnotations({
    dossierId: donnees.dossierId,
    instructeurId: getServerEnv().DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID,
    annotations: aEcrire.map(({ id, value }) => ({ id, value })),
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

/**
 * Contrôle, écrit l'annotation et enregistre le verdict en base. Rien n'est enregistré sans
 * écriture effective (ou déjà à jour), pour qu'un échec soit retenté au passage suivant.
 */
export async function controlerEtEnregistrerAvisImpot(params: {
  dossierId: string;
  dsNumber: string;
  appliquer: boolean;
  maintenant?: Date;
}): Promise<ControleAvisImpotDossier | null> {
  const maintenant = params.maintenant ?? new Date();
  const controle = await controlerEtAnnoterAvisImpot(Number(params.dsNumber), {
    appliquer: params.appliquer,
    maintenant,
  });
  if (controle && params.appliquer && (controle.issue === "ecrite" || controle.issue === "inchangee")) {
    await enregistrerControleAvisImpot(params.dossierId, {
      statut: statutAnnotationControle(controle.resultat),
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
  dossier: DossierApresSync;
  dsStatus: DSStatus | null;
  champsModifiesAt: string | undefined;
  maintenant?: Date;
}): Promise<IssueAnnotationControle | null> {
  const { dossier, dsStatus, champsModifiesAt } = params;
  const aControler = doitControlerAvisImpot({
    step: dossier.step,
    dsStatus,
    controleAt: dossier.avisImpotControleAt,
    champsModifiesAtControle: dossier.avisImpotChampsModifiesAt,
    champsModifiesAtDn: champsModifiesAt,
  });
  if (!aControler || !dossier.dsNumber || !estInstructionAutomatiqueActive(Number(dossier.dsDemarcheId))) return null;

  const controle = await controlerEtEnregistrerAvisImpot({
    dossierId: dossier.id,
    dsNumber: dossier.dsNumber,
    appliquer: true,
    maintenant: params.maintenant,
  });
  return controle?.issue ?? null;
}
