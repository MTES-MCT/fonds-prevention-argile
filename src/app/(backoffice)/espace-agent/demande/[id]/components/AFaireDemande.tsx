/**
 * Composant affichant la liste des actions à effectuer
 */
export function AFaireDemande() {
  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-todo-line fr-mr-2v" aria-hidden="true"></span>À faire
          </h3>
          <div className="fr-card__desc">
            <ul className="fr-raw-list">
              <li className="fr-mb-2w fr-mt-2w">
                <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                Contacter le demandeur
              </li>
              <li className="fr-mb-2w">
                <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                Vérifier s&apos;il y a des fissures
              </li>
              <li className="fr-mb-2w">
                <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                Contrôler la conformité des informations fournies par le demandeur
              </li>
              <li className="fr-mb-2w">
                <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                Répondre à l&apos;accompagnement pour informer le demandeur de votre prise en charge
              </li>
              <li className="fr-mb-2w">
                <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                Informer et préparer le demandeur pour les étapes suivantes
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
