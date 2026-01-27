/**
 * Composant affichant la liste des actions à effectuer pour un dossier suivi
 */
export function AFaireDossier() {
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
                Aider le ménage à compléter son dossier sur Démarche numérique.
              </li>
              <li className="fr-mb-2w">
                <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                L&apos;aider à récupérer ses pièces justificatives
              </li>
              <li className="fr-mb-2w">
                <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                S&apos;assurer de la bonne complétion et des relances si le ménage n&apos;avance pas sur le dépôt.
              </li>
              <li className="fr-mb-2w">
                <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                Préparer la suite pour effectuer le diagnostic si l&apos;éligibilité est validée par la DDT.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
