"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NavigationButtons } from "@/features/simulateur/components/shared/NavigationButtons";
import { useCreationDossierStore } from "../../stores/creation-dossier.store";
import { createDossierAllerVersAction } from "../../actions/create-dossier-aller-vers.action";
import { AddressAutocompleteInput } from "../AddressAutocompleteInput";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

/**
 * Étape 3/4 : coordonnées du demandeur.
 *
 * - Mode "avec simulation" : téléphone + email seuls. À la sortie, on crée le
 *   dossier (sans email envoyé) et on redirige vers /simulation/[parcoursId].
 * - Mode "sans simulation" : téléphone + email + adresse du bien. À la sortie,
 *   on passe à l'étape 4 (envoi email) en local.
 */
export function StepContact() {
  const router = useRouter();
  const [isCreating, startCreating] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

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
  const addressValid = !wantsSimulation ? demandeur.adresseBien.trim().length > 0 : true;
  const canGoNext = contactValid && addressValid;

  // Mode avec sim : à la sortie, on crée le dossier et on redirige vers simulation.
  const handleNext = () => {
    if (!wantsSimulation) {
      next();
      return;
    }
    setCreateError(null);
    startCreating(async () => {
      const result = await createDossierAllerVersAction({
        demandeur: {
          nom: demandeur.nom,
          prenom: demandeur.prenom,
          email: demandeur.email,
          telephone: demandeur.telephone || undefined,
        },
        sendEmail: false,
      });
      if (!result.success) {
        setCreateError(result.error);
        return;
      }
      // On NE reset PAS le store wizard ici : permet à l'agent de revenir
      // via "Précédent" sur la page simulation et retrouver le state intact.
      router.push(`/espace-agent/dossiers/nouveau/simulation/${result.data.parcoursId}`);
    });
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
          hint="Si vous ne la connaissez pas, merci d'indiquer la ville."
          value={demandeur.adresseBien}
          onChange={(adresseBien) => update({ adresseBien })}
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

      {createError && (
        <div className="fr-alert fr-alert--error fr-mt-2w">
          <p>{createError}</p>
        </div>
      )}

      <NavigationButtons
        canGoBack
        onPrevious={previous}
        onNext={handleNext}
        isNextDisabled={!canGoNext}
        isLoading={isCreating}
      />
    </>
  );
}
