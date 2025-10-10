import { EmailLayout, EmailComponents } from "./EmailLayout";

interface ValidationAmoTemplateProps {
  amoNom: string;
  demandeurNom: string;
  demandeurPrenom: string;
  demandeurCodeInsee: string;
  adresseLogement: string;
  lienValidation: string;
}

export function ValidationAmoTemplate(props: ValidationAmoTemplateProps) {
  const {
    amoNom,
    demandeurNom,
    demandeurPrenom,
    demandeurCodeInsee,
    adresseLogement,
    lienValidation,
  } = props;

  return (
    <EmailLayout
      preheader={`Nouvelle demande d'accompagnement de ${demandeurPrenom} ${demandeurNom}`}
    >
      <EmailComponents.Heading>
        Nouvelle demande d'accompagnement
      </EmailComponents.Heading>

      <EmailComponents.Paragraph>
        Bonjour <strong>{amoNom}</strong>,
      </EmailComponents.Paragraph>

      <EmailComponents.Paragraph>
        Une nouvelle demande d'accompagnement dans le cadre du Fonds Prévention
        Argile nécessite votre validation.
      </EmailComponents.Paragraph>

      <EmailComponents.Alert type="info">
        <strong>Informations du demandeur :</strong>
        <br />
        Nom : {demandeurPrenom} {demandeurNom}
        <br />
        Code INSEE : {demandeurCodeInsee}
        <br />
        Adresse du logement : {adresseLogement}
      </EmailComponents.Alert>

      <EmailComponents.Paragraph>
        Pour valider ou refuser cette demande, veuillez cliquer sur le bouton
        ci-dessous :
      </EmailComponents.Paragraph>

      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <EmailComponents.Button href={lienValidation}>
          Accéder à la demande
        </EmailComponents.Button>
      </div>

      <EmailComponents.Alert type="warning">
        Ce lien est valable pendant 30 jours. Passé ce délai, le demandeur devra
        refaire une demande.
      </EmailComponents.Alert>

      <EmailComponents.Paragraph>
        Cordialement,
        <br />
        L'équipe Fonds Prévention Argile
      </EmailComponents.Paragraph>
    </EmailLayout>
  );
}

export type { ValidationAmoTemplateProps };
