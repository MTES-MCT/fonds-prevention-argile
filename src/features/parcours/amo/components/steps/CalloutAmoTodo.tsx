"use client";

import { useAuth } from "@/features/auth/client";
import type { Amo } from "@/features/parcours/amo";
import { choisirAmo, getAmoRefusee, getAmosDisponibles } from "@/features/parcours/amo/actions";
import { useSimulateurRga } from "@/features/simulateur";
import { useEffect, useState } from "react";
import { getAllersVersByDepartementOrEpciAction } from "@/features/seo/allers-vers/actions";
import type { AllersVers } from "@/features/seo/allers-vers";
import { getCodeDepartementFromCodeInsee } from "@/features/parcours/amo/utils/amo.utils";
import { ContactCard } from "@/shared/components";

interface CalloutAmoTodoProps {
  accompagnementRefuse?: boolean;
  onSuccess?: () => void;
  refresh?: () => Promise<void>;
}

export default function CalloutAmoTodo({ accompagnementRefuse = false, onSuccess, refresh }: CalloutAmoTodoProps) {
  const { user } = useAuth();
  const { data: rgaData, isLoading: isLoadingRga } = useSimulateurRga();

  const [amoList, setAmoList] = useState<Amo[]>([]);
  const [allersVersList, setAllersVersList] = useState<AllersVers[]>([]);
  const [selectedAmoId, setSelectedAmoId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [amoRefusee, setAmoRefusee] = useState<{
    id: string;
    nom: string;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  // Charger les données des AMO au montage du composant
  useEffect(() => {
    if (isLoadingRga) {
      return;
    }

    async function loadData() {
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
          const filteredList = refuseeId ? result.data.filter((amo) => amo.id !== refuseeId) : result.data;
          setAmoList(filteredList);

          // Si aucun AMO disponible, charger les Allers Vers
          if (filteredList.length === 0) {
            await loadAllersVers();
          }
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

    async function loadAllersVers() {
      try {
        const codeInsee = rgaData?.logement?.commune;
        const codeEpci = rgaData?.logement?.epci ? String(rgaData.logement.epci) : undefined;

        if (!codeInsee) {
          return;
        }

        const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);

        const result = await getAllersVersByDepartementOrEpciAction(codeDepartement, codeEpci);

        if (result.success && result.data) {
          setAllersVersList(result.data);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des Allers Vers:", err);
      }
    }

    loadData();
  }, [accompagnementRefuse, isLoadingRga, rgaData?.logement?.commune, rgaData?.logement?.epci]);

  // Mettre à jour l'email quand user change
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleAmoSelection = (amoId: string) => {
    setSelectedAmoId(amoId);
  };

  const handleConfirm = async () => {
    if (!selectedAmoId) {
      setError("Aucun AMO sélectionné");
      return;
    }

    if (!user?.firstName || !user?.lastName) {
      setModalError("Informations utilisateur manquantes (prénom/nom)");
      return;
    }

    if (!rgaData?.logement?.adresse) {
      setModalError("Adresse du logement manquante");
      return;
    }

    if (!email?.trim()) {
      setModalError("L'email est requis");
      return;
    }
    if (!telephone?.trim()) {
      setModalError("Le numéro de téléphone est requis");
      return;
    }

    const result = await choisirAmo({
      entrepriseAmoId: selectedAmoId,
      userPrenom: user.firstName,
      userNom: user.lastName,
      adresseLogement: rgaData.logement.adresse,
      userEmail: email.trim(),
      userTelephone: telephone.trim(),
    });

    if (result.success) {
      const modal = document.getElementById("modal-confirm-amo");
      if (modal && window.dsfr) {
        window.dsfr(modal).modal.conceal();
      }

      if (onSuccess) {
        onSuccess();
      }

      if (refresh) {
        await refresh();
      }

      setModalError(null);
    } else {
      setModalError(result.error || "Erreur lors de la confirmation");
    }
  };

  const selectedAmo = amoList.find((amo) => amo.id === selectedAmoId);

  // Afficher un indicateur de chargement si les données sont en cours de chargement
  if (isLoadingRga || isLoading) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Chargement des informations...</p>
      </div>
    );
  }

  // Afficher une erreur globale si présente
  if (error) {
    return (
      <div id="choix-amo">
        <div className="fr-alert fr-alert--error">
          <p className="fr-alert__title">Erreur</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Cas 1 : Aucun AMO mais des Allers Vers disponibles
  if (amoList.length === 0 && allersVersList.length > 0) {
    return (
      <div id="choix-amo">
        <div className="fr-callout fr-callout--blue-cumulus">
          <p className="fr-callout__title">Contactez votre conseiller dédié</p>
          <p className="fr-callout__text fr-mb-4w">
            En attendant que votre Assistant à Maîtrise d'Ouvrage soit désigné, n'hésitez pas à contacter votre
            conseiller local mandaté par l'État. Il pourra répondre à vos questions afin d'être parfaitement prêt
            lorsque l'AMO sera disponible.
          </p>

          <p className="fr-text--bold fr-mb-2w">
            {allersVersList.length === 1
              ? "Votre conseiller local mandaté par l'État :"
              : "Vos conseillers locaux mandatés par l'État :"}
          </p>

          <div className="fr-grid-row fr-grid-row--gutters">
            {allersVersList.map((allerVers) => (
              <ContactCard
                key={allerVers.id}
                id={allerVers.id}
                nom={allerVers.nom}
                emails={allerVers.emails}
                telephone={allerVers.telephone}
                adresse={allerVers.adresse}
                selectable={false}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Cas 2 : Ni AMO ni Allers Vers disponibles
  if (amoList.length === 0 && allersVersList.length === 0) {
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

  // Cas 3 : Des AMO sont disponibles
  return (
    <div id="choix-amo">
      <div className="fr-callout fr-callout--yellow-moutarde">
        {!amoRefusee ? (
          <>
            <p className="fr-callout__title">Contactez un AMO</p>
            <p className="fr-callout__text fr-mb-4w">
              Le recours à un AMO (Assistant à Maîtrise d'ouvrage) est obligatoire pour bénéficier du Fonds prévention
              argile. Contactez puis confirmez la structure choisie dans les propositions ci-dessous afin de passer à
              l'étape suivante.
            </p>
          </>
        ) : (
          <>
            <p className="fr-callout__title">L'AMO "{amoRefusee.nom}" a refusé la demande d'accompagnement</p>
            <p className="fr-callout__text fr-mb-4w">
              En réponse à votre demande, l'AMO a décliné votre requête d'accompagnement. Vous pouvez soumettre une
              nouvelle demande à un autre AMO. Assurez-vous de le contacter au préalable pour confirmer votre
              collaboration.
            </p>
          </>
        )}

        <div className="fr-mt-4w">
          <p className="fr-text--bold fr-mb-2w">Indiquez l'AMO avec qui vous avez contractualisé.</p>

          <div className="fr-grid-row fr-grid-row--gutters">
            {amoList.map((amo) => (
              <ContactCard
                key={amo.id}
                id={amo.id}
                nom={amo.nom}
                emails={amo.emails}
                telephone={amo.telephone}
                adresse={amo.adresse}
                isSelected={selectedAmoId === amo.id}
                onSelect={handleAmoSelection}
                selectable={true}
              />
            ))}
          </div>
        </div>

        {selectedAmoId && (
          <div className="fr-mt-4w">
            <button type="button" className="fr-btn" aria-controls="modal-confirm-amo" data-fr-opened="false">
              Confirmer mon choix
            </button>
          </div>
        )}
      </div>

      {/* Modale de confirmation */}
      <dialog id="modal-confirm-amo" className="fr-modal" aria-labelledby="modal-confirm-amo-title">
        <div className="fr-container fr-container--fluid fr-container-md">
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
              <div className="fr-modal__body">
                <div className="fr-modal__header">
                  <button
                    aria-controls="modal-confirm-amo"
                    title="Fermer"
                    type="button"
                    className="fr-btn--close fr-btn">
                    Fermer
                  </button>
                </div>
                <div className="fr-modal__content">
                  {modalError && (
                    <div className="fr-alert fr-alert--error fr-mb-2w">
                      <p>{modalError}</p>
                    </div>
                  )}

                  <h2 id="modal-confirm-amo-title" className="fr-modal__title">
                    Demande de confirmation à l'AMO
                  </h2>

                  {selectedAmo && (
                    <div className="fr-card fr-mb-8v">
                      <div className="fr-card__body">
                        <div className="fr-card__content">
                          <h6 className="fr-card__title">{selectedAmo.nom}</h6>
                          <div className="fr-card__desc">
                            {selectedAmo.emails && <div>{selectedAmo.emails.split(";").join(", ")}</div>}
                            {selectedAmo.telephone && <div>{selectedAmo.telephone}</div>}
                            {selectedAmo.adresse && <div>{selectedAmo.adresse}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <p>
                    Pour valider votre sélection d'AMO, nous allons lui envoyer un e-mail afin de demander sa
                    confirmation. Veillez à le contacter par téléphone ou mail pour un premier contact. Vous pourrez
                    ensuite avancer à l'étape suivante.
                  </p>

                  <div className="fr-form-group">
                    <label className="fr-label" htmlFor="email-input">
                      <strong>Votre adresse email de contact *</strong>
                      <span className="fr-hint-text">Format attendu : nom@domaine.fr</span>
                    </label>
                    <input
                      className="fr-input"
                      type="email"
                      id="email-input"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="fr-form-group fr-mt-2w">
                    <label className="fr-label" htmlFor="telephone-input">
                      <strong>Votre numéro de téléphone *</strong>
                      <span className="fr-hint-text">Format attendu : 0123456789</span>
                    </label>
                    <input
                      className="fr-input"
                      type="tel"
                      id="telephone-input"
                      name="telephone"
                      pattern="[0-9]{10}"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="fr-modal__footer">
                  <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                    <li>
                      <button type="button" className="fr-btn" onClick={handleConfirm}>
                        Demander une confirmation
                      </button>
                    </li>
                    <li>
                      <button type="button" className="fr-btn fr-btn--secondary" aria-controls="modal-confirm-amo">
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
