"use client";

import { EmailNotification } from "@/shared/database";
import { listerEmails } from "@/shared/email/actions";
import { useEffect, useState } from "react";

export default function EmailNotificationsList() {
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmails = async () => {
      setIsLoading(true);
      setError(null);

      const result = await listerEmails();

      if (result.success && result.data) {
        setEmails(result.data.emails);
      } else if (!result.success) {
        setError(result.error || "Erreur lors du chargement des emails");
      } else {
        setError("Aucun email trouvé");
      }

      setIsLoading(false);
    };

    fetchEmails();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="fr-container fr-py-6w" style={{ textAlign: "center" }}>
        <span className="fr-loader" aria-label="Chargement"></span>
        <p className="fr-mt-2w">Chargement des emails...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fr-alert fr-alert--error">
        <p className="fr-alert__title">Erreur</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="fr-mb-3w">
        <p className="fr-text--bold fr-mb-1w">
          Total des inscriptions : {emails.length}
        </p>
        <p className="fr-text--sm">
          Liste des utilisateurs ayant laissé leur email pour être informés de
          l'ouverture du Fonds de Prévention dans leur département.
        </p>
      </div>

      {emails.length === 0 ? (
        <div className="fr-callout">
          <p className="fr-callout__text">
            Aucun email enregistré pour le moment.
          </p>
        </div>
      ) : (
        <div className="fr-table fr-table--bordered">
          <table>
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Département</th>
                <th scope="col">Date d'inscription</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id}>
                  <td>{email.email}</td>
                  <td>{email.departement || "Non renseigné"}</td>
                  <td>{formatDate(email.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
