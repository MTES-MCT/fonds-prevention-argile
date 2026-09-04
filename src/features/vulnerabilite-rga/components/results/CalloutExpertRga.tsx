import Link from "next/link";

/**
 * Avertissement affiché avant la liste de recommandations : ce simulateur donne des
 * pistes indicatives, pas un diagnostic. Toujours affiché, quel que soit le score.
 */
export function CalloutExpertRga() {
  return (
    <div className="fr-callout fr-icon-info-line fr-callout--blue-ecume fr-my-4w">
      <p className="fr-callout__title">Ces pistes sont indicatives</p>
      <p className="fr-callout__text">
        Ce simulateur donne une estimation simplifiée, pas un diagnostic. Pour évaluer précisément la vulnérabilité de
        votre logement et prioriser les travaux, rapprochez-vous d&apos;un expert RGA. C&apos;est justement à cela que
        sert le Fonds Prévention Argile : il peut financer ce diagnostic de vulnérabilité approfondi.
      </p>
      <Link href="/simulateur" className="fr-btn fr-btn--secondary fr-mt-2w">
        Vérifier mon éligibilité au Fonds Prévention Argile
      </Link>
    </div>
  );
}
