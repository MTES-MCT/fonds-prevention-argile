import type { ReactNode } from "react";

interface EmailLayoutProps {
  children: ReactNode;
  preheader?: string;
}

/**
 * Layout de base pour tous les emails
 * Utilise les styles inline requis pour les emails
 */
export function EmailLayout({ children, preheader }: EmailLayoutProps) {
  return (
    <html lang="fr">
      {/* eslint-disable @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>Fonds prévention argile</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#f6f6f6",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* Preheader (texte visible dans la preview de l'email) */}
        {preheader && (
          <div
            style={{
              display: "none",
              maxHeight: 0,
              overflow: "hidden",
              fontSize: "1px",
              lineHeight: "1px",
              color: "#f6f6f6",
            }}
          >
            {preheader}
          </div>
        )}

        {/* Container principal */}
        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          style={{
            width: "100%",
            margin: 0,
            padding: 0,
          }}
        >
          <tr>
            <td
              style={{
                padding: "40px 20px",
              }}
            >
              {/* Carte centrale */}
              <table
                role="presentation"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  maxWidth: "600px",
                  margin: "0 auto",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      padding: "32px 40px",
                      borderBottom: "3px solid #000091",
                    }}
                  >
                    <h1
                      style={{
                        margin: 0,
                        fontSize: "24px",
                        fontWeight: 700,
                        color: "#000091",
                      }}
                    >
                      Fonds prévention argile
                    </h1>
                  </td>
                </tr>

                {/* Contenu */}
                <tr>
                  <td
                    style={{
                      padding: "40px",
                    }}
                  >
                    {children}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      padding: "32px 40px",
                      borderTop: "1px solid #e5e5e5",
                      backgroundColor: "#f6f6f6",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#666666",
                        lineHeight: "1.5",
                      }}
                    >
                      Ceci est un message automatique, merci de ne pas y
                      répondre.
                    </p>
                    <p
                      style={{
                        margin: "8px 0 0 0",
                        fontSize: "12px",
                        color: "#666666",
                      }}
                    >
                      Pour toute question :{" "}
                      <a
                        href="mailto:contact@fonds-prevention-argile.beta.gouv.fr"
                        style={{ color: "#000091", textDecoration: "none" }}
                      >
                        contact@fonds-prevention-argile.beta.gouv.fr
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

/**
 * Composants réutilisables pour les emails
 */
export const EmailComponents = {
  /**
   * Bouton call-to-action
   */
  Button: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <table role="presentation" cellPadding="0" cellSpacing="0">
      <tr>
        <td
          style={{
            borderRadius: "4px",
            backgroundColor: "#000091",
          }}
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "16px",
            }}
          >
            {children}
          </a>
        </td>
      </tr>
    </table>
  ),

  /**
   * Paragraphe
   */
  Paragraph: ({ children }: { children: React.ReactNode }) => (
    <p
      style={{
        margin: "0 0 16px 0",
        fontSize: "16px",
        lineHeight: "1.6",
        color: "#333333",
      }}
    >
      {children}
    </p>
  ),

  /**
   * Titre
   */
  Heading: ({ children }: { children: React.ReactNode }) => (
    <h2
      style={{
        margin: "0 0 16px 0",
        fontSize: "20px",
        fontWeight: 600,
        color: "#000091",
      }}
    >
      {children}
    </h2>
  ),

  /**
   * Alerte / Callout
   */
  Alert: ({
    children,
    type = "info",
  }: {
    children: React.ReactNode;
    type?: "info" | "warning" | "success";
  }) => {
    const colors = {
      info: { bg: "#e8edff", border: "#000091" },
      warning: { bg: "#fff4e8", border: "#ff9940" },
      success: { bg: "#e8f5e9", border: "#18753c" },
    };

    return (
      <div
        style={{
          padding: "16px",
          backgroundColor: colors[type].bg,
          borderLeft: `4px solid ${colors[type].border}`,
          borderRadius: "4px",
          margin: "16px 0",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            lineHeight: "1.5",
            color: "#333333",
          }}
        >
          {children}
        </p>
      </div>
    );
  },
};
