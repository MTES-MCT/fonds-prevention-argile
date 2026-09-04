"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import { SchemaArbreProximite } from "../illustrations/SchemaArbreProximite";
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
      subtitle="Un arbre est considéré proche s'il se situe à une distance inférieure à sa hauteur une fois adulte."
      illustration={<SchemaArbreProximite />}
      bullets={[
        "Les racines d'un arbre proche assèchent le sol à son pied, ce qui accentue le retrait argileux en été",
        "Plus l'arbre est proche et sa hauteur adulte importante, plus le risque est élevé",
        "Un arbre plus éloigné que sa hauteur adulte n'est en général pas un facteur de risque direct",
      ]}
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
