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
  /** Incrémenté à chaque sauvegarde du `ContactInfoModal`. Permet de retry l'auto-attribution
   *  après que l'utilisateur a complété ses coordonnées (téléphone obligatoire). */
  contactInfoVersion?: number;
}

/**
 * Callout "AMO en attente". Couvre 2 callout selon le mode AMO :
 *  - Mode OBLIGATOIRE / AV_AMO_FUSIONNES) : Affiche ce callout dès le début du parcours, avec un message d'attente et les coordonnées de l'AMO une fois attribué
 *  - Mode FACULTATIF (après que l'utilisateur a choisi un AMO)
 */
export default function CalloutAmoEnAttente({ refresh, contactInfoVersion = 0 }: CalloutAmoEnAttenteProps = {}) {
  const { user } = useAuth();
  const { statutAmo } = useParcours();
  const amoMode = useAmoMode();

  const isAutoAttributionMode = amoMode === AmoMode.OBLIGATOIRE || amoMode === AmoMode.AV_AMO_FUSIONNES;

  const [amoChoisie, setAmoChoisie] = useState<Amo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(isAutoAttributionMode && statutAmo === null);
  // Cas où l'auto-attribution échoue car aucun AMO n'est seedé pour le territoire :
  // on bascule sur un callout dédié "AMO pas encore disponible" (cf. maquette OBLIGATOIRE).
  const [noAmoAvailable, setNoAmoAvailable] = useState(false);
  // Garde idempotente par version de coordonnées : on retry l'attribution
  // chaque fois que `contactInfoVersion` change (ex. après confirmation du modal).
  const triedVersionRef = useRef<number | null>(null);

  // Auto-attribution silencieuse au montage (modes OBLIGATOIRE / AV_AMO_FUSIONNES uniquement)
  useEffect(() => {
    if (!isAutoAttributionMode) return;
    if (statutAmo !== null) return;
    if (triedVersionRef.current === contactInfoVersion) return;
    triedVersionRef.current = contactInfoVersion;

    setError(null);
    setNoAmoAvailable(false);
    setIsAssigning(true);
    assignAmoAutomatique()
      .then((result) => {
        if (!result.success) {
          // Cas spécifique : aucun AMO seedé pour le département → callout dédié plutôt qu'erreur brute.
          if (result.error?.includes("Aucun AMO disponible")) {
            setNoAmoAvailable(true);
            return;
          }
          setError(result.error || "Impossible d'attribuer un AMO automatiquement");
          return;
        }
        return refresh?.();
      })
      .finally(() => {
        setIsAssigning(false);
      });
  }, [isAutoAttributionMode, statutAmo, refresh, contactInfoVersion]);

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

  // Cas OBLIGATOIRE / AV_AMO_FUSIONNES : aucun AMO n'est seedé pour le département du demandeur.
  if (noAmoAvailable) {
    return (
      <div id="choix-amo">
        <div className="fr-callout fr-callout--blue-cumulus">
          <p className="fr-callout__title">AMO pas encore disponible dans votre département</p>
          <p className="fr-callout__text">
            Pour bénéficier du Fonds Prévention Argile, il est impératif de faire appel à un AMO (Assistant à Maîtrise
            d'Ouvrage). Nous sommes actuellement en train de finaliser des contrats avec des AMO de votre département.
            Nous vous contacterons par e-mail dès que vous pourrez contacter les professionnels certifiés.
          </p>
        </div>
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
