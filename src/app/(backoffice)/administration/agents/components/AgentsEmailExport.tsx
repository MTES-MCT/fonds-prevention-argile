"use client";

import { useState } from "react";
import { AgentWithPermissions } from "@/features/backoffice";

interface AgentsEmailExportProps {
  /** Agents de l'onglet actif */
  agents: AgentWithPermissions[];
  /** Libellé de l'onglet actif (ex : "AMO", "Allers-Vers", "Tous") */
  tabLabel: string;
}

/**
 * Extrait les emails uniques (insensible à la casse) des agents, dans l'ordre,
 * en ignorant les valeurs vides.
 */
function getUniqueEmails(agents: AgentWithPermissions[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const { agent } of agents) {
    const email = agent.email?.trim();
    if (!email) continue;

    const key = email.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    emails.push(email);
  }

  return emails;
}

/**
 * Bouton super-admin permettant de copier dans le presse-papier la liste des
 * emails des agents de l'onglet actif, séparés par "; ", pour envoyer un mail
 * groupé depuis sa propre boîte mail.
 */
export default function AgentsEmailExport({ agents, tabLabel }: AgentsEmailExportProps) {
  const [copied, setCopied] = useState(false);
  const [errored, setErrored] = useState(false);

  const emails = getUniqueEmails(agents);
  const count = emails.length;

  const handleCopy = async () => {
    if (count === 0) return;

    try {
      await navigator.clipboard.writeText(emails.join("; "));
      setErrored(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erreur lors de la copie des emails:", err);
      setErrored(true);
    }
  };

  return (
    <div className="fr-mb-3w flex flex-col items-end">
      <button
        type="button"
        className="fr-btn fr-btn--secondary fr-btn--sm fr-icon-clipboard-line fr-btn--icon-left"
        onClick={handleCopy}
        disabled={count === 0}
        title={`Copier les emails des agents de l'onglet "${tabLabel}"`}>
        Copier les emails ({count})
      </button>
      {copied && (
        <div className="fr-alert fr-alert--success fr-alert--sm fr-mt-1w">
          <p>
            {count} email{count > 1 ? "s" : ""} copié{count > 1 ? "s" : ""} dans le presse-papier
          </p>
        </div>
      )}
      {errored && (
        <div className="fr-alert fr-alert--error fr-alert--sm fr-mt-1w">
          <p>Échec de la copie, réessayez</p>
        </div>
      )}
    </div>
  );
}
