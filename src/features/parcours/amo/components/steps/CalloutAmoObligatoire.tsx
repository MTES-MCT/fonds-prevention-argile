"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/client";
import { useParcours } from "@/features/parcours/core/context/useParcours";
import { Amo } from "@/features/parcours/amo";
import { assignAmoAutomatique, getAmoChoisie } from "@/features/parcours/amo/actions";
import { StatutValidationAmo } from "../../domain/value-objects";

interface CalloutAmoObligatoireProps {
  refresh?: () => Promise<void>;
}

/**
 * Mode AMO OBLIGATOIRE / AV_AMO_FUSIONNES (arrêté 2026).
 * - Au montage avec statut null : appelle `assignAmoAutomatique` (silencieux) puis `refresh()`.
 * - Une fois le statut EN_ATTENTE atteint : affiche le wording "Première étape : être accompagné"
 *   avec la carte de l'AMO auto-affecté.
 */
export default function CalloutAmoObligatoire({ refresh }: CalloutAmoObligatoireProps) {
  const { user } = useAuth();
  const { statutAmo } = useParcours();
  const [amoChoisie, setAmoChoisie] = useState<Amo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(statutAmo === null);
  const assignTriggeredRef = useRef(false);

  // Auto-attribution silencieuse au montage si aucune validation n'existe
  useEffect(() => {
    if (statutAmo !== null) return;
    if (assignTriggeredRef.current) return;
    assignTriggeredRef.current = true;

    setIsAssigning(true);
    assignAmoAutomatique()
      .then((result) => {
        if (!result.success) {
          setError(result.error || "Impossible d'attribuer un AMO automatiquement");
          return;
        }
        return refresh?.();
      })
      .finally(() => {
        setIsAssigning(false);
      });
  }, [statutAmo, refresh]);

  // Charge la fiche de l'AMO une fois la validation créée
  useEffect(() => {
    if (statutAmo === null) return;
    getAmoChoisie().then((result) => {
      if (result.success) {
        setAmoChoisie(result.data);
      }
    });
  }, [statutAmo]);

  if (isAssigning) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Attribution de votre AMO local en cours...</p>
      </div>
    );
  }

  // Statuts terminaux après réponse de l'AMO : on laisse les autres callouts du parent prendre le relais
  if (
    statutAmo === StatutValidationAmo.LOGEMENT_ELIGIBLE ||
    statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE ||
    statutAmo === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE
  ) {
    return null;
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
        <p className="fr-callout__title">Première étape : être accompagné</p>
        <p className="fr-callout__text fr-mb-4w">
          Dans votre département, le recours à un AMO (Assistant à Maîtrise d'Ouvrage) est obligatoire pour bénéficier
          du Fonds Prévention Argile.
        </p>

        <p className="fr-text--bold fr-mb-2w">Comment ça marche ?</p>
        <ul className="fr-mb-4w">
          <li>Nous avons informé votre AMO local afin qu'il vous accompagne dans votre projet.</li>
          <li>
            Dès qu'il aura validé votre dossier, vous recevrez une notification sur votre adresse email
            {user?.email ? ` ${user.email}` : ""}.
          </li>
          <li>Pas de réponse sous 5 jours ? N'hésitez pas à le relancer, voici ses coordonnées :</li>
        </ul>

        {amoChoisie && (
          <>
            <p className="fr-text--bold fr-mb-2w">Votre AMO dédié</p>
            <div className="fr-card">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <div className="fr-card__desc">
                    <p className="fr-text--bold fr-mb-1v">{amoChoisie.nom}</p>
                    {amoChoisie.emails && (
                      <p className="fr-text--sm fr-mb-1v">
                        <a className="fr-link" href={`mailto:${amoChoisie.emails.split(";")[0].trim()}`}>
                          {amoChoisie.emails.split(";").join(", ")}
                        </a>
                      </p>
                    )}
                    {amoChoisie.telephone && <p className="fr-text--sm fr-mb-1v">{amoChoisie.telephone}</p>}
                    {amoChoisie.adresse && <p className="fr-text--sm">{amoChoisie.adresse}</p>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
