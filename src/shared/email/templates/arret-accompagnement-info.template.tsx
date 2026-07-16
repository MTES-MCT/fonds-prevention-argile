import { EmailLayout, EmailComponents } from "./EmailLayout";

/**
 * Informe l'AMO (non mandataire financier) que le demandeur poursuit en autonomie.
 * Aucune action attendue de sa part : l'accompagnement est déjà arrêté.
 */
export function ArretAccompagnementInfoTemplate({
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
        , jusqu&apos;alors accompagné par votre structure, a décidé de poursuivre ses démarches en autonomie.
      </EmailComponents.Paragraph>
      <EmailComponents.Paragraph>
        <strong>Aucune action de votre part n&apos;est désormais requise sur ce dossier.</strong>
      </EmailComponents.Paragraph>
      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <EmailComponents.Button href={lienDossier}>Voir le dossier</EmailComponents.Button>
      </div>
    </EmailLayout>
  );
}
