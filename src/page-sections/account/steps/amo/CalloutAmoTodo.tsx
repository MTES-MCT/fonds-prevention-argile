"use client";

import { getAmosDisponibles } from "@/lib/actions/parcours/amo/amo.actions";
import { useEffect, useState } from "react";
import type { AmoDisponible } from "@/lib/parcours/amo/amo.types";

export default function CalloutAmoTodo() {
  const [amoList, setAmoList] = useState<AmoDisponible[]>([]);
  const [selectedAmoId, setSelectedAmoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAmoList() {
      try {
        const result = await getAmosDisponibles();
        if (result.success) {
          setAmoList(result.data);
        } else {
          setError(result.error || "Erreur inconnue");
        }
      } catch (err) {
        setError("Erreur lors du chargement");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAmoList();
  }, []);

  const handleAmoSelection = (amoId: string) => {
    setSelectedAmoId(amoId);
  };

  if (isLoading) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Chargement des informations AMO...</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="fr-alert fr-alert--error fr-mb-2w">
          <p className="fr-alert__title">Erreur</p>
          <p>{error}</p>
        </div>
      )}

      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
        <p className="fr-callout__title">Choisissez votre AMO</p>
        <p className="fr-callout__text fr-mb-4w">
          Le recours à un AMO (Assistant à Maîtrise d'ouvrage) est obligatoire
          pour bénéficier du Fonds Prévention Argile. Contactez puis confirmez
          la structure choisie dans les propositions ci-dessous afin de passer à
          l'étape suivante.
        </p>

        {amoList.length === 0 ? (
          <div className="fr-alert fr-alert--info fr-mt-4w">
            <p className="fr-alert__title">Aucune AMO disponible</p>
            <p>
              Aucune AMO n'est disponible pour votre commune. Veuillez contacter
              le support.
            </p>
          </div>
        ) : (
          <fieldset
            className="fr-fieldset fr-mt-4w"
            id="amo-fieldset"
            aria-labelledby="amo-fieldset-legend"
          >
            <h6>Choisissez votre Assistant à Maîtrise d'Ouvrage certifié.</h6>

            <div className="fr-grid-row fr-grid-row--gutters fr-mt-2w">
              {amoList.map((amo) => (
                <div key={amo.id} className="fr-col-12 fr-col-md-6">
                  <div className="fr-fieldset__element">
                    <div className="fr-radio-group fr-radio-rich">
                      <input
                        type="radio"
                        id={`radio-amo-${amo.id}`}
                        name="amo-selection"
                        value={amo.id}
                        checked={selectedAmoId === amo.id}
                        onChange={() => handleAmoSelection(amo.id)}
                      />
                      <label
                        className="fr-label"
                        htmlFor={`radio-amo-${amo.id}`}
                      >
                        <span className="fr-text--bold fr-mb-1v">
                          {amo.nom}
                        </span>
                        {amo.email && (
                          <span className="fr-text--sm fr-text--light block">
                            {amo.email}
                          </span>
                        )}
                        {amo.telephone && (
                          <span className="fr-text--sm fr-text--light block">
                            {amo.telephone}
                          </span>
                        )}
                        {amo.adresse && (
                          <span className="fr-text--sm fr-text--light block text-gray-500">
                            {amo.adresse}
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="fr-messages-group" aria-live="polite"></div>
          </fieldset>
        )}

        {selectedAmoId && (
          <div className="fr-mt-4w">
            <button type="button" className="fr-btn">
              Confirmer mon choix
            </button>
          </div>
        )}
      </div>
    </>
  );
}
