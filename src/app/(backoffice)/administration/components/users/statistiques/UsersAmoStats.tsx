"use client";

import StatCard from "../../shared/StatCard";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { UserWithParcoursDetails } from "@/features/backoffice";

interface UsersRepartitionStatsProps {
  users: UserWithParcoursDetails[];
  selectedDepartement: string;
}

export function UsersAmoStats({ users, selectedDepartement }: UsersRepartitionStatsProps) {
  // Calcul des statistiques AMO
  const stats = {
    total: users.length,
    amoValidee: users.filter((u) => u.amoValidation?.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE).length,
    amoEnAttente: users.filter((u) => u.amoValidation?.statut === StatutValidationAmo.EN_ATTENTE).length,
    amoRefusee: users.filter((u) => u.amoValidation?.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE).length,
  };

  return (
    <div>
      {/* Statistiques AMO */}
      <div className="fr-mb-6w">
        <p className="fr-h6 fr-mb-2w">Statistiques AMO</p>
        <div className="fr-grid-row fr-grid-row--gutters">
          {/* Total utilisateurs */}
          <StatCard
            number={stats.total.toString()}
            label={`Utilisateurs ${selectedDepartement ? "filtrés" : "inscrits"}`}
          />

          {/* AMO validée */}
          <StatCard number={stats.amoValidee.toString()} label="AMO validée" />

          {/* AMO en attente */}
          <StatCard number={stats.amoEnAttente.toString()} label="AMO en attente" />

          {/* AMO refusée */}
          <StatCard number={stats.amoRefusee.toString()} label="AMO refusée" />
        </div>
      </div>
    </div>
  );
}
