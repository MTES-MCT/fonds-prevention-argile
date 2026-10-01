"use client";

import { useId } from "react";
import type { Amo } from "../../domain/entities";
import { ContactCard } from "@/shared/components";

interface ChoixAmoListeProps {
  amos: Amo[];
  amoChoisie: string | null;
  onChoix: (amoId: string) => void;
}

/** Liste des AMO couvrant le territoire, quand il y en a plusieurs et que le demandeur choisit. */
export function ChoixAmoListe({ amos, amoChoisie, onChoix }: ChoixAmoListeProps) {
  const legendeId = useId();

  return (
    <fieldset className="fr-fieldset" aria-labelledby={legendeId}>
      <legend className="fr-fieldset__legend fr-text--bold" id={legendeId}>
        Plusieurs AMO interviennent sur votre territoire : choisissez la vôtre
        <span className="fr-hint-text">
          Vous pouvez les contacter avant de choisir. Nous informerons l&apos;AMO choisie de votre demande.
        </span>
      </legend>
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
        {amos.map((amo) => (
          <ContactCard
            key={amo.id}
            id={amo.id}
            nom={amo.nom}
            emails={amo.emails}
            telephone={amo.telephone}
            adresse={amo.adresse}
            horaires={amo.horaires}
            isSelected={amoChoisie === amo.id}
            onSelect={onChoix}
          />
        ))}
      </div>
    </fieldset>
  );
}
