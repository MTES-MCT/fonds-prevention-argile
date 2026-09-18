"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaEnsoleillement from "../illustrations/SchemaEnsoleillement.svg";
import type {
  ReponseEnsoleillement,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepEnsoleillementProps {
  initialValue?: ReponseEnsoleillement;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepEnsoleillement({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepEnsoleillementProps) {
  const [selected, setSelected] = useState<ReponseEnsoleillement | undefined>(initialValue);

  return (
    <QuestionStep<ReponseEnsoleillement>
      fieldsetName="ensoleillement"
      critereId="ensoleillement"
      title="Quelle est l'exposition de la maison au soleil ?"
      illustration={<Image src={schemaEnsoleillement} alt="" className="w-full h-auto" />}
      description="Une façade très ensoleillée, notamment exposée au sud, s'assèche plus vite en été, ce qui accentue le retrait argileux à cet endroit précis. Une façade ombragée une bonne partie de la journée est moins exposée à ce risque."
      options={[
        { value: "fort_sud", label: "Très ensoleillée, exposition sud sans protection" },
        { value: "modere", label: "Mi-ombre" },
        { value: "faible_ombrage", label: "Peu ensoleillée, ombragée une bonne partie de la journée" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ divers: { ensoleillement: selected } })}
    />
  );
}
