"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaSourceChaleurSousSol from "../illustrations/SchemaSourceChaleurSousSol.svg";
import type {
  ReponseSourceChaleurSousSol,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepSourceChaleurSousSolProps {
  initialValue?: ReponseSourceChaleurSousSol;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepSourceChaleurSousSol({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepSourceChaleurSousSolProps) {
  const [selected, setSelected] = useState<ReponseSourceChaleurSousSol | undefined>(initialValue);

  return (
    <QuestionStep<ReponseSourceChaleurSousSol>
      fieldsetName="source-chaleur-sous-sol"
      critereId="source_chaleur_sous_sol"
      title="Y a-t-il une source de chaleur en sous-sol contre un mur donnant sur l'extérieur ?"
      illustration={<Image src={schemaSourceChaleurSousSol} alt="" className="w-full h-auto" />}
      description="Une chaudière ou une autre source de chaleur placée contre un mur donnant sur l'extérieur peut, si ce mur n'est pas isolé, assécher le sol argileux de l'autre côté."
      options={[
        { value: "oui_mur_isole", label: "Oui, sur un mur isolé" },
        { value: "oui_mur_non_isole", label: "Oui, sur un mur non isolé" },
        { value: "non", label: "Non" },
        { value: "pas_de_sous_sol", label: "Pas de sous-sol" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ divers: { source_chaleur_sous_sol: selected } })}
    />
  );
}
