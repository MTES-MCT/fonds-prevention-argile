"use client";

import { useState } from "react";
import { NavigationButtons } from "@/features/simulateur/components/shared/NavigationButtons";
import { useCreationDossierStore } from "../../stores/creation-dossier.store";

/**
 * Étape coordonnées du demandeur, découpée en 3 sous-panneaux visuels
 * conformément aux maquettes : identité → coordonnées → adresse du bien.
 */
type SubStep = "identite" | "contact" | "adresse";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Format FR accepté : 0X XX XX XX XX (avec variantes ., -, espaces) ou +33/0033.
const PHONE_RE = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

export function StepCoordonnees() {
  const demandeur = useCreationDossierStore((s) => s.demandeur);
  const update = useCreationDossierStore((s) => s.updateDemandeur);
  const next = useCreationDossierStore((s) => s.next);
  const previous = useCreationDossierStore((s) => s.previous);

  const [subStep, setSubStep] = useState<SubStep>("identite");

  const canGoFromIdentite = demandeur.nom.trim().length > 0 && demandeur.prenom.trim().length > 0;
  const canGoFromContact =
    EMAIL_RE.test(demandeur.email.trim()) &&
    (demandeur.telephone.trim().length === 0 || PHONE_RE.test(demandeur.telephone.trim()));
  const canGoFromAdresse = demandeur.adresseBien.trim().length > 0;

  if (subStep === "identite") {
    return (
      <>
        <h4 className="fr-mb-1v">Comment s&apos;appelle le demandeur ?</h4>
        <p className="fr-text--sm fr-mb-4w text-gray-500">
          Ces informations seront mises à jour si nécessaire lorsque le demandeur se connectera avec France Connect
        </p>

        <div className="fr-input-group">
          <label className="fr-label" htmlFor="demandeur-prenom">
            Prénom
          </label>
          <input
            className="fr-input"
            type="text"
            id="demandeur-prenom"
            name="demandeur-prenom"
            value={demandeur.prenom}
            onChange={(e) => update({ prenom: e.target.value })}
          />
        </div>

        <div className="fr-input-group">
          <label className="fr-label" htmlFor="demandeur-nom">
            Nom
          </label>
          <input
            className="fr-input"
            type="text"
            id="demandeur-nom"
            name="demandeur-nom"
            value={demandeur.nom}
            onChange={(e) => update({ nom: e.target.value })}
          />
        </div>

        <NavigationButtons
          canGoBack
          onPrevious={previous}
          onNext={() => setSubStep("contact")}
          isNextDisabled={!canGoFromIdentite}
        />
      </>
    );
  }

  if (subStep === "contact") {
    return (
      <>
        <h4 className="fr-mb-1v">Quelles sont les coordonnées du demandeur ?</h4>
        <p className="fr-text--sm fr-mb-4w text-gray-500">
          Ces informations seront mises à jour si nécessaire lorsque le demandeur se connectera avec France Connect
        </p>

        <div className="fr-input-group">
          <label className="fr-label" htmlFor="demandeur-tel">
            Numéro de téléphone
            <span className="fr-hint-text">Format attendu : (+33) 1 22 33 44 55</span>
          </label>
          <input
            className="fr-input"
            type="tel"
            id="demandeur-tel"
            name="demandeur-tel"
            value={demandeur.telephone}
            onChange={(e) => update({ telephone: e.target.value })}
          />
        </div>

        <div className="fr-input-group">
          <label className="fr-label" htmlFor="demandeur-email">
            Adresse email
            <span className="fr-hint-text">Format attendu : nom@domaine.fr</span>
          </label>
          <input
            className="fr-input"
            type="email"
            id="demandeur-email"
            name="demandeur-email"
            value={demandeur.email}
            onChange={(e) => update({ email: e.target.value })}
          />
        </div>

        <NavigationButtons
          canGoBack
          onPrevious={() => setSubStep("identite")}
          onNext={() => setSubStep("adresse")}
          isNextDisabled={!canGoFromContact}
        />
      </>
    );
  }

  // subStep === "adresse"
  return (
    <>
      <h4 className="fr-mb-1v">Quelle est l&apos;adresse du bien du demandeur ?</h4>
      <p className="fr-text--sm fr-mb-4w text-gray-500">
        Si vous ne l&apos;a connaissez pas, merci d&apos;indiquer la ville.
      </p>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor="demandeur-adresse">
          Adresse du demandeur
        </label>
        <input
          className="fr-input"
          type="text"
          id="demandeur-adresse"
          name="demandeur-adresse"
          value={demandeur.adresseBien}
          onChange={(e) => update({ adresseBien: e.target.value })}
        />
      </div>

      <NavigationButtons
        canGoBack
        onPrevious={() => setSubStep("contact")}
        onNext={next}
        isNextDisabled={!canGoFromAdresse}
      />
    </>
  );
}
