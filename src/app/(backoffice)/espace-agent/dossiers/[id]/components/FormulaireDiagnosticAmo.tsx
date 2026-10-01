"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initierFormulaireDiagnosticAction } from "@/features/backoffice/espace-agent/dossiers/actions/initier-formulaire-diagnostic.actions";

export type EtatFormulaireDiagnosticAmo =
  /** Aucun formulaire : l'AMO peut initier la demande. */
  | { type: "a_initier" }
  /** Formulaire créé par l'AMO : lien de reprise (brouillon) ou de consultation (déposé). */
  | { type: "initie"; url: string | null; depose: boolean }
  /** Brouillon commencé par le demandeur avant la bascule : à réinitialiser d'abord. */
  | { type: "brouillon_demandeur" };

interface FormulaireDiagnosticAmoProps {
  parcoursId: string;
  etat: EtatFormulaireDiagnosticAmo;
}

/**
 * Demande de paiement du diagnostic, côté AMO mandataire financier : c'est elle qui crée le
 * formulaire DN. La visibilité (entreprise rattachée) est décidée par la page, la garde par l'action.
 */
export function FormulaireDiagnosticAmo({ parcoursId, etat }: FormulaireDiagnosticAmoProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lienCree, setLienCree] = useState<string | null>(null);

  const handleInitier = async () => {
    setError(null);
    setIsSubmitting(true);

    // Ouverture AVANT l'appel async : Safari n'autorise `window.open` qu'en contexte
    // synchrone d'un geste utilisateur.
    const dsWindow = window.open("about:blank", "_blank");
    if (dsWindow) {
      // Équivalent de `noopener`, qu'un onglet pré-ouvert ne prend pas en option.
      dsWindow.opener = null;
      dsWindow.document.title = "Chargement…";
    }

    try {
      const result = await initierFormulaireDiagnosticAction(parcoursId);
      if (!result.success) {
        dsWindow?.close();
        setError(result.error);
        return;
      }

      if (dsWindow && !dsWindow.closed) dsWindow.location.href = result.data.dossierUrl;
      // Le lien reste affiché : un bloqueur de fenêtres aurait avalé l'onglet.
      setLienCree(result.data.dossierUrl);
      router.refresh();
    } catch (err) {
      dsWindow?.close();
      console.error("Erreur initierFormulaireDiagnostic:", err);
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (etat.type === "brouillon_demandeur") {
    return (
      <div className="fr-alert fr-alert--warning fr-mb-4w">
        <p className="fr-alert__title">Le demandeur a déjà commencé un formulaire</p>
        <p>
          Son brouillon ne lui est plus proposé. Utilisez « Gérer » puis « Réinitialiser le formulaire » pour le retirer
          : vous pourrez ensuite initier la demande de paiement du diagnostic.
        </p>
      </div>
    );
  }

  const url = etat.type === "initie" ? etat.url : lienCree;

  return (
    <div className="fr-mb-4w">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          {etat.type === "initie" && etat.depose
            ? "Voir la demande de paiement du diagnostic"
            : "Reprendre la demande de paiement du diagnostic"}
        </a>
      ) : (
        <button
          type="button"
          onClick={handleInitier}
          disabled={isSubmitting}
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          {isSubmitting ? "Création en cours..." : "Initier la demande de paiement du diagnostic"}
        </button>
      )}

      {etat.type === "a_initier" && !url && (
        <p className="fr-hint-text fr-mt-1w">
          Le formulaire s&apos;ouvre sur demarche.numerique.gouv.fr et sera rattaché au compte avec lequel vous y êtes
          connecté. Le demandeur est prévenu par e-mail.
        </p>
      )}

      {error && (
        <p className="fr-error-text fr-mt-2w" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
