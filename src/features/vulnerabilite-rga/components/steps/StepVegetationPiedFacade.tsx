"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import { SchemaVegetationPiedFacade } from "../illustrations/SchemaVegetationPiedFacade";
import type {
  ReponseVegetationPiedFacade,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepVegetationPiedFacadeProps {
  initialValue?: ReponseVegetationPiedFacade;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepVegetationPiedFacade({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepVegetationPiedFacadeProps) {
  const [selected, setSelected] = useState<ReponseVegetationPiedFacade | undefined>(initialValue);

  return (
    <QuestionStep<ReponseVegetationPiedFacade>
      fieldsetName="vegetation-pied-facade"
      critereId="vegetation_pied_facade"
      title="Y a-t-il des plantations juste au pied des façades ?"
      subtitle="Potager, rosiers, arbustes ou toute plantation contre le mur, nécessitant un arrosage régulier."
      illustration={<SchemaVegetationPiedFacade />}
      bullets={[
        "Arroser régulièrement juste au pied du mur crée des apports d'eau localisés et irréguliers",
        "Sur sol argileux, ces variations d'humidité concentrées sont particulièrement défavorables",
        "Ce type de plantation est à éloigner d'office de la façade (1 à 2 mètres minimum)",
      ]}
      options={[
        { value: "presente", label: "Oui, il y a des plantations arrosées contre le mur" },
        { value: "absente", label: "Non, rien contre les murs" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ vegetation: { vegetation_pied_facade: selected } })}
    />
  );
}
