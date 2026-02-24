"use client";

import { useState } from "react";
import { QualificationCallout } from "./QualificationCallout";
import { QualificationForm } from "./QualificationForm";
import type { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";

interface QualificationData {
  decision: QualificationDecision;
  actionsRealisees: string[];
  raisonsIneligibilite: string[] | null;
  note: string | null;
  createdAt: string; // ISO string
}

interface QualificationSectionProps {
  parcoursId: string;
  /** null si aucune qualification existante */
  qualification: QualificationData | null;
  agentNom: string;
  structureNom: string;
}

/**
 * Orchestrateur de la section qualification.
 * - Si aucune qualification : affiche le formulaire dans un encadré jaune moutarde
 * - Si qualification existante : affiche le callout résultat avec bouton "Requalifier"
 * - "Requalifier" bascule vers le formulaire
 */
export function QualificationSection({
  parcoursId,
  qualification,
  agentNom,
  structureNom,
}: QualificationSectionProps) {
  const [mode, setMode] = useState<"view" | "form">(qualification ? "view" : "form");

  function handleRequalifier() {
    setMode("form");
  }

  function handleSuccess() {
    // Après soumission réussie, repasser en mode "view"
    // Le router.refresh() dans le form va re-fetcher les données côté serveur
    setMode("view");
  }

  if (mode === "view" && qualification) {
    return (
      <QualificationCallout
        decision={qualification.decision}
        actionsRealisees={qualification.actionsRealisees}
        raisonsIneligibilite={qualification.raisonsIneligibilite}
        note={qualification.note}
        agentNom={agentNom}
        structureNom={structureNom}
        createdAt={qualification.createdAt}
        onRequalifier={handleRequalifier}
      />
    );
  }

  const isUpdate = !!qualification;

  return (
    <div className={`fr-callout${isUpdate ? "" : " fr-callout--yellow-moutarde"}`}>
      <h3 className="fr-callout__title">
        {isUpdate ? "Mise à jour de la qualification" : "Qualification requise"}
      </h3>
      <p className="fr-callout__text fr-mb-3w">
        {isUpdate
          ? "Ceci entraînera le remplacement de la qualification actuelle."
          : "Complétez les informations ci-dessous pour qualifier le demandeur et son dossier afin de fluidifier son parcours."}
      </p>
      <QualificationForm
        parcoursId={parcoursId}
        onSuccess={handleSuccess}
        onCancel={qualification ? () => setMode("view") : undefined}
        isUpdate={isUpdate}
        initialValues={qualification ?? undefined}
      />
    </div>
  );
}
