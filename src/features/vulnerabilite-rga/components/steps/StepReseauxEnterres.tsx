"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaReseauxEnterres from "../illustrations/SchemaReseauxEnterres.svg";
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
      critereId="reseaux_enterres"
      title="Où passent les canalisations d'eau et d'assainissement enterrées ?"
      illustration={<Image src={schemaReseauxEnterres} alt="" className="w-full h-auto" />}
      description="Repérez les réseaux enterrés (eau potable, évacuation, descente de gouttière). Une fuite près des fondations humidifie le sol et fait gonfler l'argile localement : c'est l'une des causes les plus fréquentes de sinistre RGA. Une estimation du tracé suffit."
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
