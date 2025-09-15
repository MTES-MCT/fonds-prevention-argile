import ConnexionClient from "@/page-sections/account/ConnexionClient";
import { Suspense } from "react";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<ConnexionLoading />}>
      <ConnexionClient />
    </Suspense>
  );
}

function ConnexionLoading() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-container fr-background-alt--grey fr-px-md-0 fr-py-10v">
              <p>Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
