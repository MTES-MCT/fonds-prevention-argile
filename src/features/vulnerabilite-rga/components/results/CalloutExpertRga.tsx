import Link from "next/link";
import { CALLOUT_EXPERT_TITLE, CALLOUT_EXPERT_TEXT } from "../../domain/value-objects/resultat-content.const";

/**
 * Avertissement affiché avant la liste de recommandations : ce simulateur donne des
 * pistes indicatives, pas un diagnostic. Toujours affiché, quel que soit le score.
 * Texte partagé avec le PDF téléchargeable (`resultat-content.const.ts`).
 */
export function CalloutExpertRga() {
  return (
    <div className="fr-callout fr-icon-info-line fr-callout--blue-ecume fr-my-4w">
      <p className="fr-callout__title">{CALLOUT_EXPERT_TITLE}</p>
      <p className="fr-callout__text">{CALLOUT_EXPERT_TEXT}</p>
      <Link href="/simulateur" className="fr-btn fr-btn--secondary fr-mt-2w">
        Vérifier mon éligibilité au Fonds Prévention Argile
      </Link>
    </div>
  );
}
