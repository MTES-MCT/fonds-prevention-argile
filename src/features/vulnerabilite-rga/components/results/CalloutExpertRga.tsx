import Link from "next/link";
import { CALLOUT_EXPERT_TITLE, getCalloutExpertTexte } from "../../domain/value-objects/resultat-content.const";

interface CalloutExpertRgaProps {
  /** Le renvoi vers le simulateur d'éligibilité et la promesse de financement n'ont de sens que si le logement peut y prétendre. */
  eligibleFonds: boolean;
}

/**
 * Avertissement affiché avant la liste de recommandations : ce simulateur donne des
 * pistes indicatives, pas un diagnostic. Toujours affiché, quel que soit le résultat.
 * Texte partagé avec le PDF téléchargeable (`resultat-content.const.ts`).
 */
export function CalloutExpertRga({ eligibleFonds }: CalloutExpertRgaProps) {
  return (
    <div className="fr-callout fr-icon-info-line fr-callout--blue-ecume fr-my-4w">
      <p className="fr-callout__title">{CALLOUT_EXPERT_TITLE}</p>
      <p className="fr-callout__text">{getCalloutExpertTexte(eligibleFonds)}</p>
      {eligibleFonds && (
        <Link href="/simulateur" className="fr-btn fr-btn--secondary fr-mt-2w">
          Vérifier mon éligibilité au Fonds Prévention Argile
        </Link>
      )}
    </div>
  );
}
