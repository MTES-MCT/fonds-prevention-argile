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
  const aucuneActivite = bilan.controles === 0 && bilan.ecritures.lienFpa === 0 && bilan.echecsLienFpa === 0;
  return (
    <div className="fr-callout fr-mb-4w">
      <h2 className="fr-callout__title fr-h6">Annotations DN</h2>
      {aucuneActivite ? (
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
            {bilan.echecsLienFpa > 0 && ` · Échecs du lien FPA : ${bilan.echecsLienFpa}`}
          </li>
          {bilan.adressesNonGeocodees > 0 && (
            <li>
              Adresses non géocodées (lien en recherche texte, zone d&apos;aléa non écrite) :{" "}
              {bilan.adressesNonGeocodees}
            </li>
          )}
          <li>
            Verdicts : {VERDICTS_CONTROLE_DN.map((v) => `${LIBELLES_VERDICTS_DN[v]} ${bilan.verdicts[v]}`).join(" · ")}
          </li>
        </ul>
      )}
    </div>
  );
}

/** Ce que le CRON a fait sur un parcours : l'issue, les annotations écrites, jamais leur valeur. */
export function AnnotationsDnBadges({ entree }: { entree: AnnotationsDnEntree | null }) {
  if (!entree) return <>-</>;
  const badges: Array<{ libelle: string; classe: string }> = [];
  if (entree.issue === "echec") badges.push({ libelle: "Échec", classe: "fr-badge--error" });
  if (entree.issue === "inchangee") badges.push({ libelle: "À jour", classe: "" });
  for (const annotation of new Set(entree.annotationsEcrites)) {
    badges.push({ libelle: LIBELLES_ANNOTATIONS_DN[annotation], classe: "fr-badge--info" });
  }
  if (entree.echecLienFpa) badges.push({ libelle: "Échec du lien FPA", classe: "fr-badge--error" });
  if (entree.adresseNonGeocodee) badges.push({ libelle: "Adresse non géocodée", classe: "fr-badge--warning" });
  return (
    <ul className="fr-badges-group">
      {badges.map((b) => (
        <li key={b.libelle}>
          <span className={`fr-badge fr-badge--sm ${b.classe}`}>{b.libelle}</span>
        </li>
      ))}
    </ul>
  );
}
