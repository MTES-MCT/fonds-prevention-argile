interface AFaireProps {
  items: string[];
}

/**
 * Composant affichant la liste des actions à effectuer
 * Réutilisable sur les pages demande, dossier et prospect
 */
export function AFaire({ items }: AFaireProps) {
  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-todo-line fr-mr-2v" aria-hidden="true"></span>À faire
          </h3>
          <div className="fr-card__desc">
            <ul className="fr-raw-list">
              {items.map((item, index) => (
                <li key={index} className={index === 0 ? "fr-mb-2w fr-mt-2w" : "fr-mb-2w"}>
                  <span className="fr-icon-arrow-right-line fr-mr-1v" aria-hidden="true"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
