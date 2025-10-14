import { EmailLayout, EmailComponents } from "./EmailLayout";

export function ValidationAmoTemplate({
  lienValidation,
}: {
  lienValidation: string;
}) {
  return (
    <EmailLayout preheader={`Nouvelle demande d'accompagnement`}>
      <EmailComponents.Heading>
        Nouvelle demande d'accompagnement
      </EmailComponents.Heading>

      <EmailComponents.Paragraph>Bonjour,</EmailComponents.Paragraph>

      <EmailComponents.Paragraph>
        Un particulier nous a indiqué être accompagné par vos services dans le
        cadre du dispositif d’aide Fonds prévention argile
        (http://fonds-prevention-argile.beta.gouv.fr).
      </EmailComponents.Paragraph>

      <EmailComponents.Paragraph>
        <strong>
          Votre action est requise pour confirmer ou refuser l’accompagnement.
        </strong>
      </EmailComponents.Paragraph>

      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <EmailComponents.Button href={lienValidation}>
          Voir la demande d'accompagnement
        </EmailComponents.Button>
      </div>
    </EmailLayout>
  );
}
