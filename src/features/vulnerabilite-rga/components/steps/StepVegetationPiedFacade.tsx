"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaVegetationPiedFacade from "../illustrations/SchemaVegetationPiedFacade.svg";
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
      illustration={<Image src={schemaVegetationPiedFacade} alt="" className="w-full h-auto" />}
      description="Il s'agit d'un potager, de rosiers, d'arbustes ou de toute plantation contre le mur nécessitant un arrosage régulier : arroser juste au pied de la façade crée des apports d'eau localisés et irréguliers, particulièrement défavorables sur sol argileux. Ce type de plantation est à éloigner d'office de la façade, d'au moins 1 à 2 mètres."
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
