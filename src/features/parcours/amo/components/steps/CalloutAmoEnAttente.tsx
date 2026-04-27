"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/client";
import { useParcours } from "@/features/parcours/core/context/useParcours";
import { Amo } from "@/features/parcours/amo";
import { assignAmoAutomatique, getAmoChoisie } from "@/features/parcours/amo/actions";
import { StatutValidationAmo } from "../../domain/value-objects";
import { useAmoMode } from "../../hooks";
import { AmoMode } from "../../domain/value-objects/departements-amo";
import { ContactCard } from "@/shared/components";

interface CalloutAmoEnAttenteProps {
  /** Disponible uniquement en modes OBLIGATOIRE / AV_AMO_FUSIONNES pour déclencher
   *  l'auto-attribution puis recharger le parcours. */
  refresh?: () => Promise<void>;
}

/**
 * Callout "AMO en attente". Couvre 2 callout selon le mode AMO :
 *  - Mode OBLIGATOIRE / AV_AMO_FUSIONNES) : Affiche ce callout dès le début du parcours, avec un message d'attente et les coordonnées de l'AMO une fois attribué
 *  - Mode FACULTATIF (après que l'utilisateur a choisi un AMO)
 */
export default function CalloutAmoEnAttente({ refresh }: CalloutAmoEnAttenteProps = {}) {
  const { user } = useAuth();
  const { statutAmo } = useParcours();
  const amoMode = useAmoMode();

  const isAutoAttributionMode = amoMode === AmoMode.OBLIGATOIRE || amoMode === AmoMode.AV_AMO_FUSIONNES;

  const [amoChoisie, setAmoChoisie] = useState<Amo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(isAutoAttributionMode && statutAmo === null);
  const assignTriggeredRef = useRef(false);

  // Auto-attribution silencieuse au montage (modes OBLIGATOIRE / AV_AMO_FUSIONNES uniquement)
  useEffect(() => {
    if (!isAutoAttributionMode) return;
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
  }, [isAutoAttributionMode, statutAmo, refresh]);

  // Charge la fiche de l'AMO une fois la validation existante
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

  // Statuts terminaux : laisse les autres callouts prendre le relais
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
        {isAutoAttributionMode ? (
          <>
            <p className="fr-callout__title">Première étape : être accompagné</p>
            <p className="fr-callout__text fr-mb-4w">
              Dans votre département, le recours à un AMO (Assistant à Maîtrise d'Ouvrage) est obligatoire pour
              bénéficier du Fonds Prévention Argile.
            </p>
          </>
        ) : (
          <p className="fr-callout__title">Nous attendons la réponse de l'AMO</p>
        )}

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
            <div className="fr-grid-row">
              <ContactCard
                id={amoChoisie.id}
                nom={amoChoisie.nom}
                emails={amoChoisie.emails}
                telephone={amoChoisie.telephone}
                adresse={amoChoisie.adresse}
                selectable={false}
                colSize="half"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
