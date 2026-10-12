"use client";

import { useState } from "react";
import { ChoixRadios, QuestionStep } from "../shared/QuestionStep";
import Image from "next/image";
import schemaArbreProximite from "../illustrations/SchemaArbreProximite.svg";
import { getCritereConfig } from "../../domain/value-objects/grille-categorisation";
import type {
  ReponseArbreEssence,
  ReponseArbreProximite,
  PartialVulnerabiliteReponses,
} from "../../domain/types/vulnerabilite-reponses.types";

interface StepArbreProximiteProps {
  initialValue?: ReponseArbreProximite;
  initialEssence?: ReponseArbreEssence;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialVulnerabiliteReponses) => void;
  onBack: () => void;
}

const OPTIONS_ESSENCE = (getCritereConfig("arbre_essence")?.reponses ?? []).map(({ reponse, label, precision }) => ({
  value: reponse as ReponseArbreEssence,
  label,
  precision,
}));

export function StepArbreProximite({
  initialValue,
  initialEssence,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onSubmit,
  onBack,
}: StepArbreProximiteProps) {
  const [selected, setSelected] = useState<ReponseArbreProximite | undefined>(initialValue);
  const [essence, setEssence] = useState<ReponseArbreEssence | undefined>(initialEssence);
  const arbreProche = selected === "oui";

  return (
    <QuestionStep<ReponseArbreProximite>
      fieldsetName="arbre-proximite"
      critereId="arbre_proximite"
      title="Y a-t-il un arbre proche des fondations ?"
      illustration={<Image src={schemaArbreProximite} alt="" className="w-full h-auto" />}
      description="Un arbre proche (distance au mur inférieure à 1,5x sa hauteur adulte) va chercher l'humidité sous la maison en été. Ses racines assèchent l'argile localement, ce qui favorise son retrait et le RGA."
      options={[
        { value: "oui", label: "Oui, un arbre est proche des fondations" },
        { value: "non", label: "Non, aucun arbre proche" },
        { value: "ne_sais_pas", label: "Je ne sais pas" },
      ]}
      selected={selected}
      onSelect={setSelected}
      complement={
        arbreProche && (
          <ChoixRadios<ReponseArbreEssence>
            fieldsetName="arbre-essence"
            critereId="arbre_essence"
            legend="Quelle est l'essence de cet arbre ?"
            legendVisible
            hint="Certaines essences assèchent l'argile bien plus que d'autres ; les arbres fruitiers assèchent beaucoup moins. S'il y a plusieurs arbres, choisissez le groupe le plus haut dans la liste."
            options={OPTIONS_ESSENCE}
            selected={essence}
            onSelect={setEssence}
          />
        )
      }
      isNextDisabled={selected === undefined || (arbreProche && essence === undefined)}
      numeroEtape={numeroEtape}
      totalEtapes={totalEtapes}
      canGoBack={canGoBack}
      onBack={onBack}
      onNext={() =>
        selected &&
        onSubmit({ vegetation: { arbre_proximite: selected, arbre_essence: arbreProche ? essence : undefined } })
      }
    />
  );
}
