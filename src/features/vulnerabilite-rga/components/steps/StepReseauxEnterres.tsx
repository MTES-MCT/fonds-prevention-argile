"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import { SchemaReseauxEnterres } from "../illustrations/SchemaReseauxEnterres";
import type {
  ReponseReseauxEnterres,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepReseauxEnterresProps {
  initialValue?: ReponseReseauxEnterres;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepReseauxEnterres({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepReseauxEnterresProps) {
  const [selected, setSelected] = useState<ReponseReseauxEnterres | undefined>(initialValue);

  return (
    <QuestionStep<ReponseReseauxEnterres>
      fieldsetName="reseaux-enterres"
      title="Où passent les canalisations d'eau et d'assainissement enterrées ?"
      subtitle="Réseau d'eau potable, d'évacuation ou de descente de gouttière enterrée."
      illustration={<SchemaReseauxEnterres />}
      bullets={[
        "Une fuite d'eau sous ou près des fondations est l'une des causes les plus fréquentes de sinistre RGA",
        "Éloigner les réseaux des fondations limite le risque qu'une fuite humidifie le sol juste sous la maison",
        "Pas besoin de connaître le tracé exact : une estimation suffit",
      ]}
      options={[
        { value: "sous_fondations", label: "Les réseaux passent sous les fondations" },
        { value: "proches", label: "Les réseaux sont proches, mais pas sous les fondations" },
        { value: "eloignes", label: "Les réseaux sont éloignés des fondations" },
        { value: "ne_sais_pas", label: "Je ne sais pas" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ eaux: { reseaux_enterres: selected } })}
    />
  );
}
