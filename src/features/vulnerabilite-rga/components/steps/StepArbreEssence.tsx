"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaArbreProximite from "../illustrations/SchemaArbreProximite.svg";
import { ESSENCES_AGRESSIVITE } from "../../domain/value-objects/grille-ponderation";
import type {
  ReponseArbreEssence,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepArbreEssenceProps {
  initialValue?: ReponseArbreEssence;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

const OPTIONS = Object.entries(ESSENCES_AGRESSIVITE).map(([value, { label }]) => ({ value, label }));

export function StepArbreEssence({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepArbreEssenceProps) {
  const [selected, setSelected] = useState<ReponseArbreEssence | undefined>(initialValue);

  return (
    <QuestionStep<ReponseArbreEssence>
      fieldsetName="arbre-essence"
      critereId="arbre_essence"
      title="Quelle est l'essence de cet arbre ?"
      illustration={<Image src={schemaArbreProximite} alt="" className="w-full h-auto" />}
      description="Certaines essences assèchent le sol beaucoup plus vite que d'autres : celles à racines traçantes et à forte consommation d'eau, comme le peuplier ou le saule, sont les plus agressives, tandis que les conifères et arbres fruitiers assèchent en général beaucoup moins le sol. En cas de doute, choisissez « Autre essence » : une expertise permettra de préciser le risque."
      options={OPTIONS}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ vegetation: { arbre_essence: selected } })}
    />
  );
}
