export default function Loading() {
  return (
    <div className="fr-grid-row fr-grid-row--center">
      <div className="fr-col-12 fr-col-md-8">
        <div className="fr-card">
          <div className="fr-card__body">
            <div className="fr-text--center fr-py-4w">
              <div className="fr-mb-2w">
                <span
                  className="fr-icon-refresh-line fr-icon--lg"
                  aria-hidden="true"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </div>
              <p>Chargement de vos informations...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
