"use client";

import { Amo } from "@/features/parcours/amo";
import { getAmoChoisie } from "@/features/parcours/amo/actions";
import { useEffect, useState } from "react";

export default function CalloutAmoEnAttente() {
  const [amoChoisie, setAmoChoisie] = useState<Amo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAmoChoisie() {
      try {
        const result = await getAmoChoisie();
        if (result.success) {
          setAmoChoisie(result.data);
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

    loadAmoChoisie();
  }, []);

  if (isLoading) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Chargement des informations AMO...</p>
      </div>
    );
  }

  return (
    <div id="choix-amo">
      {error && (
        <div className="fr-alert fr-alert--error fr-mb-2w">
          <p className="fr-alert__title">Erreur</p>
          <p>{error}</p>
        </div>
      )}

      <div className="fr-callout fr-icon-info-line fr-callout--blue-ecume">
        <p className="fr-callout__title">Nous attendons la réponse de l’AMO</p>
        <p className="fr-callout__text fr-mb-4w">
          Votre demande a été envoyée avec succès. Vous recevrez une
          notification dès que l’AMO aura validé votre collaboration. Si vous ne
          recevez pas de réponse rapidement, n’hésitez pas à le relancer pour
          faire avancer votre dossier.
        </p>

        {amoChoisie && (
          <div className="fr-card fr-mt-4w">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <div className="fr-card__desc">
                  <p className="fr-text--bold fr-mb-1v">{amoChoisie.nom}</p>
                  {amoChoisie.emails && (
                    <p className="fr-text--sm fr-mb-1v">
                      Emails : {amoChoisie.emails.split(";").join(", ")}
                    </p>
                  )}
                  {amoChoisie.telephone && (
                    <p className="fr-text--sm fr-mb-1v">
                      Téléphone : {amoChoisie.telephone}
                    </p>
                  )}
                  {amoChoisie.adresse && (
                    <p className="fr-text--sm text-gray-500">
                      {amoChoisie.adresse}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
