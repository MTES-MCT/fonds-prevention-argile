import { EmailLayout, EmailComponents } from "./EmailLayout";

interface ClaimDossierTemplateProps {
  /** Prénom-Nom du demandeur affiché dans la salutation. */
  demandeurPrenomNom: string;
  /** Nom de la structure / agent qui invite (Aller-vers ou AMO). */
  inviterName: string;
  /** URL de claim (lien personnel vers FranceConnect). */
  claimUrl: string;
  /**
   * `true` si l'agent a rempli la simulation d'éligibilité avant d'envoyer
   * l'invitation. Adapte le wording du paragraphe d'introduction.
   */
  hasSimulation: boolean;
}

/**
 * Email d'invitation envoyé au demandeur après création de son dossier par
 * un agent AMO ou Aller-vers. Deux variantes de wording selon que l'agent
 * a rempli la simulation d'éligibilité ou non.
 */
export function ClaimDossierTemplate({
  demandeurPrenomNom,
  inviterName,
  claimUrl,
  hasSimulation,
}: ClaimDossierTemplateProps) {
  return (
    <EmailLayout preheader={`${inviterName} vous invite à créer votre compte Fonds Prévention Argile`}>
      <EmailComponents.Paragraph>Bonjour {demandeurPrenomNom},</EmailComponents.Paragraph>

      {hasSimulation ? (
        <>
          <EmailComponents.Paragraph>
            {inviterName} a rempli votre simulation d&apos;éligibilité sur le site du Fonds Prévention Argile (
            <a href="https://fonds-prevention-argile.beta.gouv.fr" style={{ color: "#000091" }}>
              fonds-prevention-argile.beta.gouv.fr
            </a>
            ). Cette étape est nécessaire pour déposer votre demande d&apos;aide.
          </EmailComponents.Paragraph>
          <p style={{ margin: "0 0 16px 0", fontSize: "16px", lineHeight: "1.6", color: "#333333", fontWeight: 700 }}>
            Pour continuer votre demande, il vous suffit de créer votre compte en quelques clics.
          </p>
        </>
      ) : (
        <>
          <EmailComponents.Paragraph>
            {inviterName} vous invite à créer votre compte sur le site du Fonds Prévention Argile (
            <a href={claimUrl} style={{ color: "#000091" }}>
              fonds-prevention-argile.beta.gouv.fr
            </a>
            ) pour déposer votre demande d&apos;aide.
          </EmailComponents.Paragraph>
          <p style={{ margin: "0 0 16px 0", fontSize: "16px", lineHeight: "1.6", color: "#333333", fontWeight: 700 }}>
            C&apos;est rapide et sécurisé : cela vous permettra de suivre vos démarches dans un espace centralisé.
          </p>
        </>
      )}

      <p style={{ margin: "16px 0 8px 0", fontSize: "16px", lineHeight: "1.6", color: "#333333" }}>
        Pourquoi créer un compte ?
      </p>
      <ul style={{ margin: "0 0 16px 0", paddingLeft: "20px", fontSize: "16px", lineHeight: "1.6", color: "#333333" }}>
        <li>✅ Vérifier votre éligibilité (si cela n&apos;a pas encore été fait)</li>
        <li>✅ Compléter les formulaires nécessaires simplement</li>
        <li>✅ Suivre l&apos;avancement de votre dossier</li>
      </ul>

      <div style={{ marginTop: "24px", marginBottom: "8px" }}>
        <EmailComponents.Button href={claimUrl}>Créer mon compte</EmailComponents.Button>
      </div>
    </EmailLayout>
  );
}
