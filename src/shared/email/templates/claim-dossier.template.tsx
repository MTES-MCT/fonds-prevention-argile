import { EmailLayout, EmailComponents } from "./EmailLayout";

export function ClaimDossierTemplate({
  demandeurPrenom,
  claimUrl,
}: {
  demandeurPrenom: string;
  claimUrl: string;
}) {
  return (
    <EmailLayout preheader="Finalisez votre inscription au Fonds Prévention Argile">
      <EmailComponents.Heading>Bonjour {demandeurPrenom},</EmailComponents.Heading>

      <EmailComponents.Paragraph>
        Un agent du dispositif Fonds Prévention Argile a préparé un dossier à votre nom.
      </EmailComponents.Paragraph>

      <EmailComponents.Paragraph>
        Pour finaliser votre inscription et accéder à votre dossier, cliquez sur le bouton ci-dessous. Vous serez
        redirigé vers FranceConnect pour créer votre compte en toute sécurité.
      </EmailComponents.Paragraph>

      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <EmailComponents.Button href={claimUrl}>Finaliser mon inscription</EmailComponents.Button>
      </div>

      <EmailComponents.Paragraph>
        Ce lien est personnel et valable 90 jours. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer
        ce message.
      </EmailComponents.Paragraph>
    </EmailLayout>
  );
}
