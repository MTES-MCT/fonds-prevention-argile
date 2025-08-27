import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";

export default function Bienvenue() {
  return (
    <>
      <div className="fr-container-fluid">
        <div className="fr-container">
          <Breadcrumb
            items={[
              {
                label: "Accueil",
                href: "/",
              },
              {
                label: "Analyse des devis",
                href: undefined,
              },
              {
                label: `Etape 1/4`,
              },
            ]}
          />
        </div>
      </div>

      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-lg-10">
              <h1 className="fr-h2 fr-mb-6v text-left">
                Pouvez-vous nous en dire plus sur vous ?
              </h1>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
