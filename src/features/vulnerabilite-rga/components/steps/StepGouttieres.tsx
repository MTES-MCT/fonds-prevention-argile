"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaGouttieres from "../illustrations/SchemaGouttieres.svg";
import type { ReponseGouttieres, PartialVulnerabiliteReponses } from "../../domain/types/vulnerabilite-reponses.types";

interface StepGouttieresProps {
  initialValue?: ReponseGouttieres;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepGouttieres({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepGouttieresProps) {
  const [selected, setSelected] = useState<ReponseGouttieres | undefined>(initialValue);

  return (
    <QuestionStep<ReponseGouttieres>
      fieldsetName="gouttieres"
      critereId="gouttieres"
      title="Dans quel état sont les gouttières ?"
      illustration={<Image src={schemaGouttieres} alt="" className="w-full h-auto" />}
      description="Des gouttières bouchées, absentes ou débordantes déversent l'eau de pluie directement au pied du mur. Cela fait gonfler l'argile localement et favorise le RGA."
      options={[
        { value: "absentes_ou_debordantes", label: "Absentes, débordantes ou mal entretenues" },
        { value: "entretenues_evacuation_proche", label: "Entretenues, mais l'évacuation est proche des fondations" },
        { value: "entretenues_evacuation_loin", label: "Entretenues, avec une évacuation loin des fondations" },
        { value: "ne_sais_pas", label: "Je ne sais pas" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ eaux: { gouttieres: selected } })}
    />
  );
}
