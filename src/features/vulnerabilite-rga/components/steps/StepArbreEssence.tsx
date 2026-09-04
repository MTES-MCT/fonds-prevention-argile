"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import { SchemaArbreProximite } from "../illustrations/SchemaArbreProximite";
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
      subtitle="Certaines essences assèchent le sol beaucoup plus vite que d'autres."
      illustration={<SchemaArbreProximite />}
      bullets={[
        "Les essences à racines traçantes et à forte consommation d'eau (peuplier, saule...) sont les plus agressives",
        "Les conifères et arbres fruitiers assèchent en général beaucoup moins le sol",
        "Si vous hésitez, choisissez « Autre essence » : une expertise permettra de préciser le risque",
      ]}
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
