"use client";

import { useRouter } from "next/navigation";
import { NavigationButtons } from "@/features/simulateur/components/shared/NavigationButtons";
import { mapBanFeatureToAddressData, type BanFeature } from "@/shared/adapters/ban";
import { getEpciByCommune } from "@/shared/adapters/geo";
import { useCreationDossierStore } from "../../stores/creation-dossier.store";
import { AddressAutocompleteInput } from "../AddressAutocompleteInput";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

/**
 * Étape 3/4 : coordonnées du demandeur.
 *
 * - Mode "avec simulation" : téléphone + email seuls. À la sortie, on
 *   navigue vers la page simulation. Aucune écriture DB ici : le dossier
 *   n'est créé qu'au clic final sur "Envoyer et enregistrer le dossier".
 * - Mode "sans simulation" : téléphone + email + adresse du bien. À la sortie,
 *   on passe à l'étape 4 (envoi email) en local.
 */
export function StepContact() {
  const router = useRouter();

  const demandeur = useCreationDossierStore((s) => s.demandeur);
  const wantsSimulation = useCreationDossierStore((s) => s.wantsSimulation);
  const update = useCreationDossierStore((s) => s.updateDemandeur);
  const next = useCreationDossierStore((s) => s.next);
  const previous = useCreationDossierStore((s) => s.previous);

  const telephoneInput = demandeur.telephone.trim();
  const emailInput = demandeur.email.trim();
  const telephoneInvalid = telephoneInput.length > 0 && !PHONE_RE.test(telephoneInput);
  const emailInvalid = emailInput.length > 0 && !EMAIL_RE.test(emailInput);
  const contactValid = EMAIL_RE.test(emailInput) && (telephoneInput.length === 0 || PHONE_RE.test(telephoneInput));
  // Mode sans simulation : la sélection d'une suggestion BAN est obligatoire.
  // Une saisie libre sans clic sur une suggestion → pas de détails structurés
  // (code département, EPCI…) → dossier invisible pour les AV avec filtre
  // territorial. On force donc le choix d'une suggestion.
  const addressValid = !wantsSimulation ? demandeur.adresseBienDetails !== null : true;
  const addressTypedButNotSelected =
    !wantsSimulation && demandeur.adresseBien.trim().length > 0 && demandeur.adresseBienDetails === null;
  const canGoNext = contactValid && addressValid;

  // Mode avec sim : on quitte le wizard inline pour rejoindre la page simulation.
  // Le dossier n'est PAS encore créé en DB → la création se fait au clic final
  // dans ResultInvitation (avec demandeur + simulation complète en un seul appel).
  const handleNext = () => {
    if (!wantsSimulation) {
      next();
      return;
    }
    router.push(`/espace-agent/dossiers/nouveau/simulation`);
  };

  return (
    <>
      <h4 className="fr-mb-1v">Quelles sont les coordonnées du demandeur ?</h4>
      {!wantsSimulation && (
        <p className="fr-text--sm fr-mb-4w text-gray-500">
          Ces informations seront mises à jour si nécessaire lorsque le demandeur se connectera avec France Connect
        </p>
      )}

      {!wantsSimulation && (
        <AddressAutocompleteInput
          label="Adresse postale du logement concerné"
          hint="Tapez les premiers caractères puis sélectionnez une suggestion dans la liste."
          value={demandeur.adresseBien}
          onChange={(adresseBien) => update({ adresseBien })}
          errorMessage={
            addressTypedButNotSelected
              ? "Veuillez sélectionner une adresse dans les suggestions proposées."
              : undefined
          }
          onSelectFeature={async (feature: BanFeature | null) => {
            if (!feature) {
              update({ adresseBienDetails: null });
              return;
            }
            // Mapping immédiat sans EPCI (territoire matché via code_departement
            // en attendant la réponse Geo).
            const partial = mapBanFeatureToAddressData(feature);
            update({ adresseBienDetails: partial });
            try {
              const epci = await getEpciByCommune(feature.properties.citycode);
              if (epci) {
                update({ adresseBienDetails: { ...partial, codeEpci: epci } });
              }
            } catch (error) {
              console.error("[StepContact] Erreur récupération EPCI :", error);
              // On laisse adresseBienDetails sans EPCI ; le match département suffit.
            }
          }}
        />
      )}

      <div className={`fr-input-group ${telephoneInvalid ? "fr-input-group--error" : ""}`}>
        <label className="fr-label" htmlFor="demandeur-tel">
          Numéro de téléphone
          <span className="fr-hint-text">Format attendu : (+33) 1 22 33 44 55</span>
        </label>
        <input
          className={`fr-input ${telephoneInvalid ? "fr-input--error" : ""}`}
          type="tel"
          id="demandeur-tel"
          name="demandeur-tel"
          value={demandeur.telephone}
          aria-invalid={telephoneInvalid || undefined}
          aria-describedby={telephoneInvalid ? "demandeur-tel-error" : undefined}
          onChange={(e) => update({ telephone: e.target.value })}
        />
        {telephoneInvalid && (
          <p id="demandeur-tel-error" className="fr-error-text">
            Format de téléphone invalide. Exemple attendu : 06 11 22 33 44.
          </p>
        )}
      </div>

      <div className={`fr-input-group ${emailInvalid ? "fr-input-group--error" : ""}`}>
        <label className="fr-label" htmlFor="demandeur-email">
          Adresse email
          <span className="fr-hint-text">Format attendu : nom@domaine.fr</span>
        </label>
        <input
          className={`fr-input ${emailInvalid ? "fr-input--error" : ""}`}
          type="email"
          id="demandeur-email"
          name="demandeur-email"
          value={demandeur.email}
          aria-invalid={emailInvalid || undefined}
          aria-describedby={emailInvalid ? "demandeur-email-error" : undefined}
          onChange={(e) => update({ email: e.target.value })}
        />
        {emailInvalid && (
          <p id="demandeur-email-error" className="fr-error-text">
            Format d&apos;email invalide. Exemple attendu : nom@domaine.fr.
          </p>
        )}
      </div>

      <NavigationButtons
        canGoBack
        onPrevious={previous}
        onNext={handleNext}
        isNextDisabled={!canGoNext}
      />
    </>
  );
}
