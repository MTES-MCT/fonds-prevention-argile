"use client";

import Link from "next/link";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";

export default function SimulationNeededAlert() {
  return (
    <div className="fr-container fr-background-alt--grey fr-px-md-0">
      <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center fr-p-20v">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-6 fr-mt-2w">
          <div className="fr-alert fr-alert--error">
            <h3 className="fr-alert__title">Eligibilité manquante.</h3>
            <p>Suite à une mise à jour, il est impératif de remplir à nouveau le simulateur.</p>
          </div>

          <div className="container fr-mt-4w">
            <Link href={ROUTES.simulateur} className="fr-btn fr-btn--icon-right fr-mt-2w fr-icon-arrow-right-s-line">
              Remplir le simulateur
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
