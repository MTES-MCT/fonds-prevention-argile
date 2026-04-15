export default function SuperAdminReadOnlyBanner() {
  return (
    <div className="fr-notice fr-notice--info">
      <div className="fr-container">
        <div className="fr-notice__body">
          <p className="fr-notice__title">
            Vue agent depuis "Super administrateur" — lecture seule. Les actions d&apos;écriture sont désactivées dans l&apos;espace agent.
          </p>
        </div>
      </div>
    </div>
  );
}
