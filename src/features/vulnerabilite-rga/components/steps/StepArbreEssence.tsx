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
      description="Certaines essences ont un fort pouvoir de succion et assèchent l'argile plus vite. Les plus agressives sont les peupliers et les saules (racines traçantes, forte consommation d'eau) ; les conifères et fruitiers assèchent beaucoup moins."
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
