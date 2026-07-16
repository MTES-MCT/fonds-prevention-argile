import { EmailLayout, EmailComponents } from "./EmailLayout";

/**
 * Demande à l'AMO mandataire financier de se prononcer sur l'arrêt de l'accompagnement.
 * L'engagement contractuel impose son accord : le dossier reste accompagné tant qu'il
 * n'a pas répondu.
 */
export function ArretAccompagnementValidationTemplate({
  demandeurPrenom,
  demandeurNom,
  lienDossier,
}: {
  demandeurPrenom: string;
  demandeurNom: string;
  lienDossier: string;
}) {
  return (
    <EmailLayout preheader="Annulation d'un accompagnement">
      <EmailComponents.Heading>Annulation d&apos;un accompagnement</EmailComponents.Heading>
      <EmailComponents.Paragraph>Bonjour,</EmailComponents.Paragraph>
      <EmailComponents.Paragraph>
        <strong>
          {demandeurPrenom} {demandeurNom}
        </strong>
        , jusqu&apos;alors accompagné(e) par votre structure, a décidé de poursuivre ses démarches en autonomie.
      </EmailComponents.Paragraph>
      <EmailComponents.Paragraph>
        Vous avez indiqué être <strong>mandataire financier</strong> de ce dossier. Votre accord est donc nécessaire
        pour annuler l&apos;accompagnement.
      </EmailComponents.Paragraph>
      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <EmailComponents.Button href={lienDossier}>Agir sur le dossier</EmailComponents.Button>
      </div>
    </EmailLayout>
  );
}
