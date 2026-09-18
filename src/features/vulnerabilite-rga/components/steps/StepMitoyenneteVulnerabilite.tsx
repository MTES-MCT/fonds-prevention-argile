"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaMitoyennete from "../illustrations/SchemaMitoyennete.svg";
import type { ReponseMitoyennete, PartialVulnerabiliteReponses } from "../../domain/types/vulnerabilite-reponses.types";

interface StepMitoyenneteVulnerabiliteProps {
  initialValue?: ReponseMitoyennete;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

export function StepMitoyenneteVulnerabilite({
  initialValue,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepMitoyenneteVulnerabiliteProps) {
  const [selected, setSelected] = useState<ReponseMitoyennete | undefined>(initialValue);

  return (
    <QuestionStep<ReponseMitoyennete>
      fieldsetName="mitoyennete"
      critereId="mitoyennete"
      title="La maison est-elle mitoyenne ?"
      illustration={<Image src={schemaMitoyennete} alt="" className="w-full h-auto" />}
      description="Sur une maison mitoyenne, les mouvements de sol subis par le bâti voisin peuvent se transmettre au vôtre et favoriser le RGA. Si le voisin a déjà engagé des travaux de prévention, le risque partagé diminue "
      options={[
        { value: "pas_mitoyen", label: "Maison individuelle, non mitoyenne" },
        { value: "mitoyen_voisin_travaux_prevention", label: "Mitoyenne, le voisin a fait des travaux de prévention" },
        {
          value: "mitoyen_voisin_sans_travaux",
          label: "Mitoyenne, le voisin n'a pas fait de travaux (ou je ne sais pas)",
        },
      ]}
      selected={selected}
      onSelect={setSelected}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() => selected && onSubmit({ divers: { mitoyennete: selected } })}
    />
  );
}
