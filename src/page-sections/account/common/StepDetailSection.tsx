import StepDetailAccountCard from "./StepDetailAccountCard";

export default function StepDetailSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        {/* Zone texte */}
        <h2 className="text-left">Les étapes de votre parcours en détail</h2>

        {/* Zone cartes étapes détaillées */}
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailAccountCard />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailAccountCard />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailAccountCard />
          </div>
          <div className="fr-col-12 fr-col-md-3">
            <StepDetailAccountCard />
          </div>
        </div>
      </div>
    </section>
  );
}
