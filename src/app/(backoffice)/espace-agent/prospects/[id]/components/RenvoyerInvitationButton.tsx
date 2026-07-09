"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renvoyerInvitationAction } from "@/features/backoffice/espace-agent/prospects/actions/renvoyer-invitation.actions";

interface RenvoyerInvitationButtonProps {
  parcoursId: string;
  email: string;
}

/**
 * Callout + bouton affiché quand le demandeur a été invité par un agent mais n'a
 * pas encore créé son compte (user stub non réclamé). Renvoie l'email d'invitation.
 */
export function RenvoyerInvitationButton({ parcoursId, email }: RenvoyerInvitationButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleClick = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await renvoyerInvitationAction(parcoursId);
      if (!result.success) {
        setFeedback({ type: "error", message: result.error });
        return;
      }
      setFeedback({ type: "success", message: `Email d'invitation renvoyé à ${email}.` });
      router.refresh();
    });
  };

  return (
    <div className="fr-callout fr-icon-mail-line fr-callout--yellow-moutarde fr-mb-4w">
      <h3 className="fr-callout__title fr-text--md">Le demandeur n&apos;a pas encore créé son compte</h3>
      <p className="fr-callout__text fr-text--sm">
        Il a été invité par email à créer son compte via FranceConnect mais ne l&apos;a pas encore fait. Vous pouvez lui
        renvoyer l&apos;email d&apos;invitation.
      </p>
      <button
        type="button"
        className="fr-btn fr-btn--sm fr-icon-mail-line fr-btn--icon-left"
        onClick={handleClick}
        disabled={isPending}>
        {isPending ? "Envoi en cours..." : "Renvoyer l'email d'invitation"}
      </button>
      {feedback && (
        <div className={`fr-alert fr-alert--${feedback.type} fr-alert--sm fr-mt-2w`} role="alert">
          <p>{feedback.message}</p>
        </div>
      )}
    </div>
  );
}
