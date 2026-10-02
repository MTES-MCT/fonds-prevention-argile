import type { AnnotationsDnEntree, BilanAnnotationsDn } from "@/shared/domain/value-objects/bilan-annotations-dn";
import { ANNOTATIONS_DN, VERDICTS_CONTROLE_DN } from "@/shared/domain/value-objects/bilan-annotations-dn";
import { LIBELLES_ANNOTATIONS_DN, LIBELLES_VERDICTS_DN, dossiersMisAJour } from "./annotations-dn.format";

/** Synthèse d'un run : compteurs agrégés, aucune donnée de dossier. */
export function BilanAnnotationsDnEncart({ bilan }: { bilan: BilanAnnotationsDn | null }) {
  if (!bilan) {
    return (
      <p className="fr-text--sm fr-mb-4w text-(--text-mention-grey)">
        Annotations DN : non suivies pour ce run, antérieur au bilan.
      </p>
    );
  }
  return (
    <div className="fr-callout fr-mb-4w">
      <h2 className="fr-callout__title fr-h6">Annotations DN</h2>
      {bilan.controles === 0 ? (
        <p className="fr-callout__text">Aucun contrôle de l&apos;avis d&apos;imposition n&apos;a été lancé.</p>
      ) : (
        <ul className="fr-callout__text fr-text--sm">
          <li>
            Contrôles lancés : {bilan.controles} · Dossiers mis à jour : {dossiersMisAJour(bilan)} · Déjà à jour :{" "}
            {bilan.aJour} · Échecs : {bilan.echecs}
          </li>
          <li>
            Annotations écrites :{" "}
            {ANNOTATIONS_DN.map((a) => `${LIBELLES_ANNOTATIONS_DN[a]} ${bilan.ecritures[a]}`).join(" · ")}
          </li>
          <li>
            Verdicts : {VERDICTS_CONTROLE_DN.map((v) => `${LIBELLES_VERDICTS_DN[v]} ${bilan.verdicts[v]}`).join(" · ")}
          </li>
        </ul>
      )}
    </div>
  );
}

/** Ce que le contrôle a fait sur un dossier : les annotations écrites, jamais leur valeur. */
export function AnnotationsDnBadges({ entree }: { entree: AnnotationsDnEntree | null }) {
  if (!entree) return <>-</>;
  if (entree.issue === "echec") return <span className="fr-badge fr-badge--sm fr-badge--error">Échec</span>;
  if (entree.issue === "inchangee") return <span className="fr-badge fr-badge--sm">À jour</span>;
  return (
    <ul className="fr-badges-group">
      {entree.annotationsEcrites.map((a) => (
        <li key={a}>
          <span className="fr-badge fr-badge--sm fr-badge--info">{LIBELLES_ANNOTATIONS_DN[a]}</span>
        </li>
      ))}
    </ul>
  );
}
