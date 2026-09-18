"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaGravierProprete from "../illustrations/SchemaGravierProprete.svg";
import type {
  ReponseGravierProprete,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepGravierPropreteProps {
  initialValue?: ReponseGravierProprete;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepGravierProprete({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepGravierPropreteProps) {
  const [selected, setSelected] = useState<ReponseGravierProprete | undefined>(initialValue);

  return (
    <QuestionStep<ReponseGravierProprete>
      fieldsetName="gravier-proprete"
      critereId="gravier_proprete"
      title="Y a-t-il un lit de gravier en pied de façade ?"
      illustration={<Image src={schemaGravierProprete} alt="" className="w-full h-auto" />}
      description="Il s'agit d'une bande de graviers posée directement sur la terre, au ras du mur : sans membrane étanche dessous, le gravier laisse l'eau de pluie s'infiltrer directement au pied du mur, et ces infiltrations répétées juste sous les fondations favorisent les cycles de gonflement et de retrait du sol. L'absence de gravier (terre nue ou dallage étanche) limite ce risque."
      options={[
        { value: "present", label: "Oui, il y a un lit de gravier en pied de façade" },
        { value: "absent", label: "Non, il n'y en a pas" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ eaux: { gravier_proprete: selected } })}
    />
  );
}
