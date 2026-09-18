import {
  SOURCES_VULNERABILITE_TITRE,
  SOURCES_VULNERABILITE_INTRO,
  SOURCES_VULNERABILITE_CHAPO,
  SOURCES_VULNERABILITE_ITEMS,
} from "../../domain/value-objects/resultat-content.const";

/**
 * Pédagogie RGA déplacée depuis l'écran d'accueil (`StepIntro`) vers l'écran de résultat :
 * plus utile une fois le score connu que comme préambule avant de démarrer. Texte partagé
 * avec le PDF téléchargeable (`resultat-content.const.ts`).
 */
export function ComprendreSourcesVulnerabilite() {
  return (
    <div className="fr-my-4w">
      <h4 className="fr-mb-2w">{SOURCES_VULNERABILITE_TITRE}</h4>
      <p className="fr-mb-3w">{SOURCES_VULNERABILITE_INTRO}</p>

      <p className="fr-mb-2w fr-text--bold">{SOURCES_VULNERABILITE_CHAPO}</p>
      <ul className="fr-mb-0">
        {SOURCES_VULNERABILITE_ITEMS.map((item) => (
          <li key={item.label}>
            <strong>{item.label}</strong> : {item.texte}
          </li>
        ))}
      </ul>
    </div>
  );
}
