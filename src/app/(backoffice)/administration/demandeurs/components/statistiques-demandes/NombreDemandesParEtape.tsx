"use client";

import { useMemo } from "react";
import { StepperStats } from "./StepStatCard";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { UserWithParcoursDetails } from "@/features/backoffice";

const ETAPES = [
  { step: Step.CHOIX_AMO, label: "AMO", color: "#BAFAEE" },
  { step: Step.ELIGIBILITE, label: "Éligibilité", color: "#8BF8E7" },
  { step: Step.DIAGNOSTIC, label: "Diag.", color: "#79E7D5" },
  { step: Step.DEVIS, label: "Devis", color: "#5BB5A7" },
  { step: Step.FACTURES, label: "Factures", color: "#009081" },
];

interface NombreDemandesParEtapeProps {
  users: UserWithParcoursDetails[];
}

export function NombreDemandesParEtape({ users }: NombreDemandesParEtapeProps) {
  const counts = useMemo(() => {
    const result = ETAPES.map((e) => ({
      ...e,
      count: users.filter((u) => u.parcours?.currentStep === e.step).length,
    }));
    return result;
  }, [users]);

  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <div>
      <h3 className="fr-h6 fr-mb-2w">Nombre de demandes par étape</h3>
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <StepperStats
          items={counts.map((item) => ({
            label: item.label,
            value: item.count.toLocaleString("fr-FR"),
            fillPercent: (item.count / max) * 100,
            color: item.color,
          }))}
        />
      </div>
    </div>
  );
}
