"use client";

import StatCard from "../../shared/StatCard";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { UserWithParcoursDetails } from "@/features/backoffice";

interface UsersEtapesStatsProps {
  users: UserWithParcoursDetails[];
  selectedDepartement: string;
}

export function UsersEtapesStats({ users }: UsersEtapesStatsProps) {
  // Calcul des statistiques AMO
  const stats = {
    total: users.length,
    parEtape: {
      choixAmo: users.filter((u) => u.parcours?.currentStep === Step.CHOIX_AMO).length,
      eligibilite: users.filter((u) => u.parcours?.currentStep === Step.ELIGIBILITE).length,
      diagnostic: users.filter((u) => u.parcours?.currentStep === Step.DIAGNOSTIC).length,
      devis: users.filter((u) => u.parcours?.currentStep === Step.DEVIS).length,
      factures: users.filter((u) => u.parcours?.currentStep === Step.FACTURES).length,
    },
  };

  return (
    <div>
      {/* Répartition par étape */}
      {stats.total > 0 && (
        <div className="fr-mb-6w">
          <p className="fr-h6 fr-mb-2w">Répartition par étape</p>
          <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">
            Nombre d'utilisateurs actuellement à chaque étape du parcours.
          </p>

          <div className="fr-grid-row fr-grid-row--gutters">
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Choix AMO"
              number={stats.parEtape.choixAmo.toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Éligibilité"
              number={stats.parEtape.eligibilite.toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Diagnostic"
              number={stats.parEtape.diagnostic.toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Devis"
              number={stats.parEtape.devis.toString()}
            />
            <StatCard
              className="fr-col-12 fr-col-md-3 fr-col-lg-2"
              label="Factures"
              number={stats.parEtape.factures.toString()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
