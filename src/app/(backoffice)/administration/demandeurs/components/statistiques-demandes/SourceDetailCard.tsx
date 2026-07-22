interface SourceDetailCardProps {
  demandeur: string;
  departement: string | null;
  sourcePrecision: string;
}

/**
 * Carte individuelle affichant le détail d'une réponse "source d'acquisition" avec
 * précision libre (Autre, Assurance, Site gouvernemental) : demandeur, département,
 * et texte libre saisi par le demandeur.
 *
 * Layout calqué sur DemandeArchiveeCard (drawer "Demandes archivées").
 */
export function SourceDetailCard({ demandeur, departement, sourcePrecision }: SourceDetailCardProps) {
  return (
    <div
      className="fr-mb-3w fr-p-2w"
      style={{
        border: "1px solid var(--border-default-grey)",
        borderRadius: "0.5rem",
      }}>
      <div className="fr-mb-1v">
        <p className="fr-text--sm fr-mb-0">
          Demandeur : <strong>{demandeur}</strong>
        </p>
        <p className="fr-text--xs fr-mb-0 fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
          Département : {departement ?? "Non renseigné"}
        </p>
      </div>

      <div className="fr-p-2w fr-mt-1v" style={{ backgroundColor: "#f6f6f6", borderRadius: "0.25rem" }}>
        <p className="fr-text--sm fr-mb-0" style={{ whiteSpace: "pre-wrap" }}>
          &ldquo;{sourcePrecision}&rdquo;
        </p>
      </div>
    </div>
  );
}
