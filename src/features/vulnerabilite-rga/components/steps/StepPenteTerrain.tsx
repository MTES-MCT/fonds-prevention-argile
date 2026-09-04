"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import { SchemaPenteTerrain } from "../illustrations/SchemaPenteTerrain";
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
      title="Quelle est la pente du terrain autour de la maison ?"
      subtitle="Regardez si l'eau de pluie s'écoule vers la maison ou s'en éloigne."
      illustration={<SchemaPenteTerrain />}
      bullets={[
        "Une pente qui descend vers une façade y ramène l'eau de pluie à chaque orage",
        "Cette eau, concentrée au même endroit, fait gonfler puis se rétracter le sol argileux juste sous les fondations",
        "Une pente qui éloigne l'eau de la maison est la situation la plus favorable",
      ]}
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
