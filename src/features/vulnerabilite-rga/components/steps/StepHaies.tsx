"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaHaies from "../illustrations/SchemaHaies.svg";
import type { ReponseHaies, PartialVulnerabiliteReponses } from "../../domain/types/vulnerabilite-reponses.types";

interface StepHaiesProps {
  initialValue?: ReponseHaies;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepHaies({ initialValue, numeroEtape, totalEtapes, canGoBack, onSubmit, onBack }: StepHaiesProps) {
  const [selected, setSelected] = useState<ReponseHaies | undefined>(initialValue);

  return (
    <QuestionStep<ReponseHaies>
      fieldsetName="haies"
      critereId="haies"
      title="Y a-t-il une haie proche de la maison ?"
      illustration={<Image src={schemaHaies} alt="" className="w-full h-auto" />}
      description="Comme un arbre, une haie dense et proche de la maison assèche le sol à son pied. Une taille régulière limite le développement des racines et donc le risque ; pour une nouvelle plantation, mieux vaut prévoir une distance d'au moins quelques mètres de la façade."
      options={[
        { value: "proches_denses", label: "Proche des fondations et dense" },
        { value: "proches_moyennement_denses", label: "Proche des fondations, moyennement dense" },
        { value: "eloignees_peu_denses", label: "Éloignée des fondations et peu dense" },
        { value: "ne_sais_pas", label: "Je ne sais pas" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ vegetation: { haies: selected } })}
    />
  );
}
