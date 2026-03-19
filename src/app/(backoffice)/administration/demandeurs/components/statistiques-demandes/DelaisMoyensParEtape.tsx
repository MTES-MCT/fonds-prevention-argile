"use client";

import { useMemo } from "react";
import { StepStatCard } from "./StepStatCard";
import type { UserWithParcoursDetails } from "@/features/backoffice";

/** Calcule la différence en jours entre deux dates */
function diffJours(debut: Date, fin: Date): number {
  return Math.max(0, Math.round((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Calcule la moyenne d'un tableau de nombres, retourne 0 si vide */
function moyenne(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

const BAR_COLORS = [
  "#E6EEFE", // AMO
  "#DAE6FD", // Éligibilité
  "#BCD3FC", // Diag
  "#8AB8F9", // Devis
  "#76ADF8", // Factures
  "#417DC4", // Total
];

interface DelaisMoyensParEtapeProps {
  users: UserWithParcoursDetails[];
}

export function DelaisMoyensParEtape({ users }: DelaisMoyensParEtapeProps) {
  const delais = useMemo(() => {
    const delaisAmo: number[] = [];
    const delaisEligibilite: number[] = [];
    const delaisDiagnostic: number[] = [];
    const delaisDevis: number[] = [];
    const delaisFactures: number[] = [];
    const delaisTotal: number[] = [];

    for (const u of users) {
      if (!u.parcours) continue;
      const parcoursCreatedAt = u.parcours.createdAt;

      // Délai AMO : de la création du parcours au choix de l'AMO
      if (u.amoValidation?.choisieAt) {
        delaisAmo.push(diffJours(parcoursCreatedAt, u.amoValidation.choisieAt));
      }

      // Délai Éligibilité : du choix AMO à la validation AMO
      if (u.amoValidation?.choisieAt && u.amoValidation?.valideeAt) {
        delaisEligibilite.push(diffJours(u.amoValidation.choisieAt, u.amoValidation.valideeAt));
      }

      // Délai Diagnostic : de la validation AMO à la soumission du dossier diagnostic
      if (u.amoValidation?.valideeAt && u.dossiers.diagnostic?.submittedAt) {
        delaisDiagnostic.push(diffJours(u.amoValidation.valideeAt, u.dossiers.diagnostic.submittedAt));
      }

      // Délai Devis : de la soumission diagnostic à la soumission devis
      if (u.dossiers.diagnostic?.submittedAt && u.dossiers.devis?.submittedAt) {
        delaisDevis.push(diffJours(u.dossiers.diagnostic.submittedAt, u.dossiers.devis.submittedAt));
      }

      // Délai Factures : de la soumission devis à la soumission factures
      if (u.dossiers.devis?.submittedAt && u.dossiers.factures?.submittedAt) {
        delaisFactures.push(diffJours(u.dossiers.devis.submittedAt, u.dossiers.factures.submittedAt));
      }

      // Délai total : de la création du parcours à la dernière action
      if (u.parcours.completedAt) {
        delaisTotal.push(diffJours(parcoursCreatedAt, u.parcours.completedAt));
      } else if (u.parcours.updatedAt) {
        delaisTotal.push(diffJours(parcoursCreatedAt, u.parcours.updatedAt));
      }
    }

    return [
      { label: "AMO", jours: moyenne(delaisAmo) },
      { label: "Éligibilité", jours: moyenne(delaisEligibilite) },
      { label: "Diag.", jours: moyenne(delaisDiagnostic) },
      { label: "Devis", jours: moyenne(delaisDevis) },
      { label: "Factures", jours: moyenne(delaisFactures) },
      { label: "Total", jours: moyenne(delaisTotal) },
    ];
  }, [users]);

  const max = Math.max(...delais.map((d) => d.jours), 1);

  return (
    <div>
      <h3 className="fr-h6 fr-mb-2w">Délais moyens par étape</h3>
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
          display: "flex",
          gap: "1.5rem",
        }}>
        {delais.map((item, index) => (
          <StepStatCard
            key={item.label}
            value={item.jours.toLocaleString("fr-FR")}
            suffix="j"
            label={item.label}
            fillPercent={(item.jours / max) * 100}
            barColor={BAR_COLORS[index]}
          />
        ))}
      </div>
    </div>
  );
}
