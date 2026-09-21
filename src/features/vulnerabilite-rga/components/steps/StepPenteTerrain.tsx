"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaPenteTerrain from "../illustrations/SchemaPenteTerrain.svg";
import type {
  ReponsePenteTerrain,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepPenteTerrainProps {
  initialValue?: ReponsePenteTerrain;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepPenteTerrain({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepPenteTerrainProps) {
  const [selected, setSelected] = useState<ReponsePenteTerrain | undefined>(initialValue);

  return (
    <QuestionStep<ReponsePenteTerrain>
      fieldsetName="pente-terrain"
      critereId="pente_terrain"
      title="Quelle est la pente du terrain autour de la maison ?"
      illustration={<Image src={schemaPenteTerrain} alt="" className="w-full h-auto" />}
      description="Vérifiez le sens d'écoulement de l'eau sur votre terrain. Une pente orientée vers la maison accumule l'eau au pied des fondations, ce qui fait gonfler l'argile localement et favorise le RGA."
      options={[
        { value: "vers_facade", label: "La pente descend vers une façade de la maison" },
        { value: "plat", label: "Le terrain est plat" },
        { value: "eloignee_facade", label: "La pente s'éloigne de la maison" },
        { value: "ne_sais_pas", label: "Je ne sais pas" },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ eaux: { pente_terrain: selected } })}
    />
  );
}
