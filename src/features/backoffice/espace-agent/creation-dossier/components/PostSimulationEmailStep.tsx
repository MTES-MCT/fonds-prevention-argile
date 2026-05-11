"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NavigationButtons } from "@/features/simulateur/components/shared/NavigationButtons";
import { sendInvitationEmailAction } from "../actions/send-invitation-email.action";

interface PostSimulationEmailStepProps {
  parcoursId: string;
}

export function PostSimulationEmailStep({ parcoursId }: PostSimulationEmailStepProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendInvitationEmailAction(parcoursId, sendEmail);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/espace-agent/prospects/${parcoursId}`);
    });
  };

  return (
    <>
      <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
        <div className="fr-collapse">
          <ol className="fr-breadcrumb__list">
            <li>
              <Link className="fr-breadcrumb__link" href="/espace-agent/dossiers">
                Accueil
              </Link>
            </li>
            <li>
              <span className="fr-breadcrumb__link" aria-current="page">
                Ajout d&apos;un nouveau dossier
              </span>
            </li>
          </ol>
        </div>
      </nav>

      <h1 className="fr-mb-1v">Ajout d&apos;un nouveau dossier</h1>
      <p className="fr-text--md fr-mb-0 text-gray-500">
        Ce dossier pourra être rattaché à un demandeur (France Connect)
      </p>

      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france) fr-mt-4w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
              <div className="bg-white fr-p-6w">
                <div className="fr-stepper">
                  <h2 className="fr-stepper__title">
                    Faire une simulation d&apos;éligibilité puis créer le dossier
                    <span className="fr-stepper__state">Étape 4 sur 4</span>
                  </h2>
                  <div className="fr-stepper__steps" data-fr-current-step={4} data-fr-steps={4}></div>
                </div>

                <h4 className="fr-mb-1v fr-mt-4w">
                  Envoyer un email automatique au demandeur pour l&apos;inciter à créer son compte sur le site du Fonds
                  Prévention Argile ?
                </h4>
                <p className="fr-text--sm fr-mb-4w text-gray-500">
                  Vous pouvez le faire manuellement si vous préférez.
                </p>

                <div className="fr-form-group">
                  <fieldset className="fr-fieldset">
                    <div className="fr-fieldset__content">
                      <div className="fr-radio-group">
                        <input
                          type="radio"
                          id="post-sim-email-oui"
                          name="post-sim-email"
                          checked={sendEmail === true}
                          onChange={() => setSendEmail(true)}
                        />
                        <label className="fr-label" htmlFor="post-sim-email-oui">
                          Envoyer un email
                        </label>
                      </div>
                      <div className="fr-radio-group">
                        <input
                          type="radio"
                          id="post-sim-email-non"
                          name="post-sim-email"
                          checked={sendEmail === false}
                          onChange={() => setSendEmail(false)}
                        />
                        <label className="fr-label" htmlFor="post-sim-email-non">
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
                  canGoBack={false}
                  onNext={handleSubmit}
                  nextLabel={sendEmail ? "Envoyer et terminer" : "Terminer"}
                  isLoading={isPending}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
