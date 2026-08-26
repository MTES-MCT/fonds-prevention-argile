import { Step } from "@/shared/domain/value-objects/step.enum";
import { DS_FIELD_IDS } from "./ds-field-ids";

/**
 * Annotations privées (instructeur) dont l'id dépend de la démarche.
 *
 * Cas général : un id de champ DS est partagé par toutes les démarches issues d'un même
 * clone — c'est pourquoi `DS_FIELD_IDS` s'en sort avec une constante par champ. Les
 * annotations ajoutées à la main APRÈS le clonage échappent à cette règle et sont
 * numérotées indépendamment dans chaque démarche : elles vivent ici, indexées par
 * numéro. Relever un id avec `pnpm ds:fetch-schema <numero>`.
 */

/**
 * « Lien vers le dossier sur le fonds de prévention argile », démarche d'éligibilité.
 * Diagnostic et devis n'ont pas ce problème : leur annotation précède le clonage, son
 * id est commun aux deux environnements (cf. `DS_FIELD_IDS`).
 */
export const DS_ANNOTATION_LIEN_FPA_ELIGIBILITE: Record<number, string> = {
  126061: "Q2hhbXAtNjY4NzQ1Mg==", // prod
  146377: "Q2hhbXAtNjY4NzQ3NQ==", // préprod
};

/**
 * Id de l'annotation « lien FPA » pour la démarche d'éligibilité courante, ou `null` si
 * la démarche est inconnue. DS ignore silencieusement un `champ_` inexistant : mieux vaut
 * un warn dans les logs qu'une annotation qu'on croit remplie.
 */
export function getAnnotationLienFpaEligibilite(demarcheNumber: number): string | null {
  const champId = DS_ANNOTATION_LIEN_FPA_ELIGIBILITE[demarcheNumber];
  if (!champId) {
    console.warn(
      `Éligibilité: démarche ${demarcheNumber} inconnue, annotation « lien FPA » non préremplie. ` +
        `Relever son id avec \`pnpm ds:fetch-schema ${demarcheNumber}\` et l'ajouter à DS_ANNOTATION_LIEN_FPA_ELIGIBILITE.`
    );
    return null;
  }
  return champId;
}

/**
 * Id du descripteur de l'annotation « lien FPA » pour une étape donnée. Diagnostic et devis
 * partagent le même id (antérieur au clonage) ; l'éligibilité dépend de la démarche.
 */
export function getAnnotationLienFpaId(step: Step, demarcheNumber: number): string | null {
  if (step === Step.ELIGIBILITE) return getAnnotationLienFpaEligibilite(demarcheNumber);
  if (step === Step.DIAGNOSTIC) return DS_FIELD_IDS.DIAGNOSTIC.ANNOTATION_LIEN_FPA;
  if (step === Step.DEVIS) return DS_FIELD_IDS.DEVIS.ANNOTATION_LIEN_FPA;
  return null;
}
