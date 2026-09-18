"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaArbreProximite from "../illustrations/SchemaArbreProximite.svg";
import type {
  ReponseArbreProximite,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepArbreProximiteProps {
  initialValue?: ReponseArbreProximite;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepArbreProximite({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepArbreProximiteProps) {
  const [selected, setSelected] = useState<ReponseArbreProximite | undefined>(initialValue);

  return (
    <QuestionStep<ReponseArbreProximite>
      fieldsetName="arbre-proximite"
      critereId="arbre_proximite"
      title="Y a-t-il un arbre proche des fondations ?"
      illustration={<Image src={schemaArbreProximite} alt="" className="w-full h-auto" />}
      description="Un arbre proche (distance au mur inférieure à sa hauteur adulte) va chercher l'humidité sous la maison en été. Ses racines assèchent l'argile localement, ce qui favorise son retrait et le RGA."
      options={[
        { value: "oui", label: "Oui, un arbre est proche des fondations" },
        { value: "non", label: "Non, aucun arbre proche" },
        { value: "ne_sais_pas", label: "Je ne sais pas" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ vegetation: { arbre_proximite: selected } })}
    />
  );
}
