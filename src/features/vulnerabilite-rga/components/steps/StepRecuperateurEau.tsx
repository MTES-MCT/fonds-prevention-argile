"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaRecuperateurEau from "../illustrations/SchemaRecuperateurEau.svg";
import type {
  ReponseRecuperateurEau,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepRecuperateurEauProps {
  initialValue?: ReponseRecuperateurEau;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepRecuperateurEau({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepRecuperateurEauProps) {
  const [selected, setSelected] = useState<ReponseRecuperateurEau | undefined>(initialValue);

  return (
    <QuestionStep<ReponseRecuperateurEau>
      fieldsetName="recuperateur-eau"
      critereId="recuperateur_eau"
      title="Avez-vous un récupérateur d'eau de pluie ?"
      illustration={<Image src={schemaRecuperateurEau} alt="" className="w-full h-auto" />}
      description="Collé à la descente de gouttière, un récupérateur d'eau est presque toujours en pied de façade. S'il fuit ou est mal raccordé, il déverse l'eau directement contre le mur, avec le même effet qu'une gouttière défaillante."
      options={[
        { value: "absent", label: "Non, je n'en ai pas" },
        { value: "present_bon_etat", label: "Oui, en bon état et bien raccordé" },
        { value: "present_fuite_ou_mal_raccorde", label: "Oui, mais il fuit ou est mal raccordé" },
        { value: "ne_sais_pas", label: "J'en ai un, mais je ne sais pas dans quel état il est" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ eaux: { recuperateur_eau: selected } })}
    />
  );
}
