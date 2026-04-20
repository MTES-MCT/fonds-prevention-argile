"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NavigationButtons } from "@/features/simulateur/components/shared/NavigationButtons";
import { useCreationDossierStore } from "../../stores/creation-dossier.store";
import { createDossierAllerVersAction } from "../../actions/create-dossier-aller-vers.action";

export function StepEnvoiEmail() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sendEmail = useCreationDossierStore((s) => s.sendEmail);
  const setSendEmail = useCreationDossierStore((s) => s.setSendEmail);
  const demandeur = useCreationDossierStore((s) => s.demandeur);
  const wantsSimulation = useCreationDossierStore((s) => s.wantsSimulation);
  const reset = useCreationDossierStore((s) => s.reset);
  const previous = useCreationDossierStore((s) => s.previous);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createDossierAllerVersAction({
        demandeur: {
          nom: demandeur.nom,
          prenom: demandeur.prenom,
          email: demandeur.email,
          telephone: demandeur.telephone || undefined,
        },
        adresseBien: demandeur.adresseBien,
        sendEmail,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      const parcoursId = result.data.parcoursId;
      reset();

      // Si l'AV a choisi "avec simulation", on le redirige vers la page du
      // prospect avec un indicateur pour ouvrir immédiatement le simulateur.
      if (wantsSimulation) {
        router.push(`/espace-agent/prospects/${parcoursId}?action=simulation`);
      } else {
        router.push(`/espace-agent/prospects/${parcoursId}`);
      }
    });
  };

  return (
    <>
      <h4 className="fr-mb-1v">
        Envoyer un email automatique au demandeur pour l&apos;inciter à créer son compte sur le site du Fonds Prévention
        Argile ?
      </h4>
      <p className="fr-text--sm fr-mb-4w text-gray-500">Vous pouvez le faire manuellement si vous préférez.</p>

      <div className="fr-form-group">
        <fieldset className="fr-fieldset">
          <div className="fr-fieldset__content">
            <div className="fr-radio-group">
              <input
                type="radio"
                id="envoi-email-oui"
                name="envoi-email"
                checked={sendEmail === true}
                onChange={() => setSendEmail(true)}
              />
              <label className="fr-label" htmlFor="envoi-email-oui">
                Envoyer un email
              </label>
            </div>
            <div className="fr-radio-group">
              <input
                type="radio"
                id="envoi-email-non"
                name="envoi-email"
                checked={sendEmail === false}
                onChange={() => setSendEmail(false)}
              />
              <label className="fr-label" htmlFor="envoi-email-non">
                Ne pas envoyer d&apos;email
              </label>
            </div>
          </div>
        </fieldset>
      </div>

      {error && (
        <div className="fr-alert fr-alert--error fr-mt-2w">
          <p>{error}</p>
        </div>
      )}

      <NavigationButtons
        canGoBack
        onPrevious={previous}
        onNext={handleSubmit}
        nextLabel={sendEmail ? "Envoyer et enregistrer le dossier" : "Enregistrer le dossier"}
        isLoading={isPending}
      />
    </>
  );
}
