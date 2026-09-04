"use client";

import { useState } from "react";
import { QuestionStep } from "../shared/QuestionStep";
import { SchemaMitoyennete } from "../illustrations/SchemaMitoyennete";
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
      title="La maison est-elle mitoyenne ?"
      illustration={<SchemaMitoyennete />}
      bullets={[
        "Sur une maison mitoyenne, les mouvements de sol du côté du voisin peuvent affecter votre propre bâti",
        "Si le voisin a déjà engagé des travaux de prévention, le risque partagé diminue",
        "Une maison individuelle non mitoyenne n'est pas concernée par ce risque",
      ]}
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
