import { formatRelativeTimeShort } from "@/shared/utils/date.utils";
import type { DemandeArchiveeDetail } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface DemandeArchiveeCardProps {
  demande: DemandeArchiveeDetail;
}

/**
 * Carte individuelle affichant le détail d'une demande archivée.
 *
 * Layout inspiré des NoteItem (notes partagées) :
 * - Ligne 1 : "Demandeur : NOM" (lien)
 * - Ligne 2 : "Par STRUCTURE-AMO . il y a Xj"
 * - Bloc gris : contenu de la raison d'archivage
 */
export function DemandeArchiveeCard({ demande }: DemandeArchiveeCardProps) {
  const tempsRelatif = formatRelativeTimeShort(demande.archivedAt);

  return (
    <div
      className="fr-mb-3w fr-p-2w"
      style={{
        border: "1px solid var(--border-default-grey)",
        borderRadius: "0.5rem",
      }}>
      {/* En-tête */}
      <div className="fr-mb-1v">
        {/* Ligne 1 : Demandeur */}
        <p className="fr-text--sm fr-mb-0">
          Demandeur :{" "}
          <a className="fr-link fr-text--sm" href="#">
            {demande.demandeur}
          </a>
        </p>

        {/* Ligne 2 : Par [agent] [structure] . temps relatif */}
        <div className="fr-grid-row fr-grid-row--middle fr-mt-1v">
          <div className="fr-col">
            <span className="fr-text--xs" style={{ color: "var(--text-mention-grey)" }}>
              Par {demande.agent && <strong>{demande.agent}</strong>}
              {demande.agent && demande.structureAmo && " "}
              {demande.structureAmo && <span style={{ fontStyle: "italic" }}>{demande.structureAmo}</span>}
              {!demande.agent && !demande.structureAmo && "Agent inconnu"}
              <span className="fr-mx-1v" aria-hidden="true">
                &bull;
              </span>
              {tempsRelatif}
            </span>
          </div>
        </div>
      </div>

      {/* Contenu : raison d'archivage sur fond gris */}
      <div className="fr-p-2w" style={{ backgroundColor: "#f6f6f6", borderRadius: "0.25rem" }}>
        <p className="fr-text--sm fr-mb-0" style={{ whiteSpace: "pre-wrap" }}>
          &ldquo;{demande.raison}&rdquo;
        </p>
      </div>
    </div>
  );
}
