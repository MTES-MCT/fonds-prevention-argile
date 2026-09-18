/**
 * Pédagogie RGA déplacée depuis l'écran d'accueil (`StepIntro`) vers l'écran de résultat :
 * plus utile une fois le score connu que comme préambule avant de démarrer.
 */
export function ComprendreSourcesVulnerabilite() {
  return (
    <div className="fr-my-4w">
      <h4 className="fr-mb-2w">Comprendre les sources de vulnérabilité</h4>
      <p className="fr-mb-3w">
        Le retrait-gonflement des argiles (RGA) fragilise les maisons individuelles quand le sol argileux se rétracte en
        période sèche puis regonfle avec l&apos;humidité.
      </p>

      <p className="fr-mb-2w fr-text--bold">Trois sources de vulnérabilité :</p>
      <ul className="fr-mb-0">
        <li>
          <strong>Le sol</strong> : l&apos;aléa argileux de votre terrain — on ne peut pas agir dessus, les solutions ne
          sont pas encore éprouvées.
        </li>
        <li>
          <strong>Le bâtiment</strong> : notamment les fondations — des travaux efficaces mais coûteux, à réserver à un
          diagnostic d&apos;expert.
        </li>
        <li>
          <strong>L&apos;environnement proche</strong> : gestion de l&apos;eau et de la végétation autour de la maison —
          c&apos;est là que des gestes simples, à moindre coût, ont le plus d&apos;impact. C&apos;est le cœur de ce
          simulateur.
        </li>
      </ul>
    </div>
  );
}
