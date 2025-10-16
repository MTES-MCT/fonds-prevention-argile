"use client";

import {
  choisirAmo,
  getAmosDisponibles,
  getAmoRefusee,
} from "@/lib/actions/parcours/amo/amo.actions";
import { useEffect, useState } from "react";
import type { AmoDisponible } from "@/lib/parcours/amo/amo.types";
import { useAuth } from "@/lib/auth/client";
import { useRGAContext } from "@/lib/form-rga/session/useRGAContext";

interface CalloutAmoTodoProps {
  accompagnementRefuse?: boolean;
  onSuccess?: () => void;
  refresh?: () => Promise<void>;
}

export default function CalloutAmoTodo({
  accompagnementRefuse = false,
  onSuccess,
  refresh,
}: CalloutAmoTodoProps) {
  const { user } = useAuth();
  const { data: rgaData } = useRGAContext();

  const [amoList, setAmoList] = useState<AmoDisponible[]>([]);
  const [selectedAmoId, setSelectedAmoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [amoRefusee, setAmoRefusee] = useState<{
    id: string;
    nom: string;
  } | null>(null);

  // Charger les données des AMO au montage du composant
  useEffect(() => {
    async function loadAmoData() {
      try {
        let refuseeId: string | null = null;

        // Charger l'AMO refusée si accompagnementRefuse
        if (accompagnementRefuse) {
          const refuseeResult = await getAmoRefusee();
          if (refuseeResult.success && refuseeResult.data) {
            setAmoRefusee(refuseeResult.data);
            refuseeId = refuseeResult.data.id;
          }
        }

        // Charger la liste des AMO disponibles
        const result = await getAmosDisponibles();
        if (result.success) {
          // Filtrer l'AMO refusée de la liste si elle existe
          const filteredList = refuseeId
            ? result.data.filter((amo) => amo.id !== refuseeId)
            : result.data;
          setAmoList(filteredList);
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

    loadAmoData();
  }, [accompagnementRefuse]);

  // Gérer la sélection d'un AMO
  const handleAmoSelection = (amoId: string) => {
    setSelectedAmoId(amoId);
  };

  // Gérer la confirmation de l'AMO sélectionnée
  const handleConfirm = async () => {
    if (!selectedAmoId) {
      setError("Aucun AMO sélectionné");
      return;
    }

    // Validation des données personnelles
    if (!user?.firstName || !user?.lastName) {
      setError("Informations utilisateur manquantes (prénom/nom)");
      return;
    }

    if (!rgaData?.logement?.adresse) {
      setError("Adresse du logement manquante");
      return;
    }

    // Appel de l'action avec les données personnelles
    const result = await choisirAmo({
      entrepriseAmoId: selectedAmoId,
      userPrenom: user.firstName,
      userNom: user.lastName,
      adresseLogement: rgaData.logement.adresse,
    });

    if (result.success) {
      // Fermer la modale avec l'API DSFR
      const modal = document.getElementById("modal-confirm-amo");
      if (modal && window.dsfr) {
        window.dsfr(modal).modal.conceal();
      }

      // Appeler le callback onSuccess si fourni
      if (onSuccess) {
        onSuccess();
      }

      // Rafraîchir les données du parcours
      if (refresh) {
        await refresh();
      }

      setError(null);
    } else {
      setError(result.error || "Erreur lors de la confirmation");
    }
  };

  const selectedAmo = amoList.find((amo) => amo.id === selectedAmoId);

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

      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
        {!amoRefusee ? (
          <>
            <p className="fr-callout__title">Choisissez votre AMO</p>
            <p className="fr-callout__text fr-mb-4w">
              Le recours à un AMO (Assistant à Maîtrise d'ouvrage) est
              obligatoire pour bénéficier du Fonds prévention argile. Contactez
              puis confirmez la structure choisie dans les propositions
              ci-dessous afin de passer à l'étape suivante.
            </p>
          </>
        ) : (
          <>
            <p className="fr-callout__title">
              L'AMO "{amoRefusee.nom}" a refusé la demande d'accompagnement
            </p>
            <p className="fr-callout__text fr-mb-4w">
              En réponse à votre demande, l'AMO a décliné votre requête
              d'accompagnement. Vous pouvez soumettre une nouvelle demande à un
              autre AMO. Assurez-vous de le contacter au préalable pour
              confirmer votre collaboration.
            </p>
          </>
        )}

        {amoList.length === 0 ? (
          <div className="fr-alert fr-alert--info fr-mt-4w">
            <p className="fr-alert__title">Aucune AMO disponible</p>
            <p>
              Aucun AMO n'est disponible pour le moment dans votre commune. Veuillez contacter
              le support - contact@fonds-preventions-argile.beta.gouv.fr
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
                        {amo.emails && (
                          <span className="fr-text--sm fr-text--light block">
                            {amo.emails.split(";").join(", ")}
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
            <button
              type="button"
              className="fr-btn"
              aria-controls="modal-confirm-amo"
              data-fr-opened="false"
            >
              Confirmer mon choix
            </button>
          </div>
        )}
      </div>

      {/* Modale de confirmation */}
      <dialog
        id="modal-confirm-amo"
        className="fr-modal"
        aria-labelledby="modal-confirm-amo-title"
      >
        <div className="fr-container fr-container--fluid fr-container-md">
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
              <div className="fr-modal__body">
                <div className="fr-modal__header">
                  <button
                    aria-controls="modal-confirm-amo"
                    title="Fermer"
                    type="button"
                    className="fr-btn--close fr-btn"
                  >
                    Fermer
                  </button>
                </div>
                <div className="fr-modal__content">
                  <h2 id="modal-confirm-amo-title" className="fr-modal__title">
                    <span
                      className="fr-icon-arrow-right-line fr-icon--lg"
                      aria-hidden="true"
                    ></span>{" "}
                    Demande de confirmation à l'AMO
                  </h2>
                  <p>
                    Pour valider votre sélection d'AMO, nous allons lui envoyer
                    un e-mail afin de demander sa confirmation. Vous pourrez
                    ensuite avancer à l'étape suivante.
                  </p>

                  {selectedAmo && (
                    <div className="fr-card">
                      <div className="fr-card__body">
                        <div className="fr-card__content">
                          <h6 className="fr-card__title">{selectedAmo.nom}</h6>
                          <div className="fr-card__desc">
                            {selectedAmo.emails && (
                              <div>
                                {selectedAmo.emails.split(";").join(", ")}
                              </div>
                            )}
                            {selectedAmo.telephone && (
                              <div>{selectedAmo.telephone}</div>
                            )}
                            {selectedAmo.adresse && (
                              <div>{selectedAmo.adresse}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="fr-modal__footer">
                  <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                    <li>
                      <button
                        type="button"
                        className="fr-btn"
                        onClick={handleConfirm}
                      >
                        Demander une confirmation
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="fr-btn fr-btn--secondary"
                        aria-controls="modal-confirm-amo"
                      >
                        Annuler
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
