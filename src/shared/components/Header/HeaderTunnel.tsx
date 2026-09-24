import { LIEN_AIDE_SIMULATEUR } from "@/shared/constants/aide.constants";
import { BoutonAideMobile } from "./BoutonAideMobile";
import { HeaderMarque } from "./HeaderMarque";

/**
 * Header du tunnel simulateur : aucune action hors du parcours, seulement l'aide.
 * Pas de menu burger sur mobile : un menu qui ne contiendrait que ce lien coûterait un clic.
 */
export function HeaderTunnel() {
  return (
    <header role="banner" className="fr-header">
      <div className="fr-header__body">
        <div className="fr-container">
          <div className="fr-header__body-row">
            <HeaderMarque navbar={<BoutonAideMobile />} />
            {/* Pas de fr-header__tools-links : le JS DSFR le recopie dans un menu mobile absent d'ici et plante. */}
            <div className="fr-header__tools max-[62em]:hidden!">
              <a
                href={LIEN_AIDE_SIMULATEUR}
                className="fr-btn fr-btn--tertiary-no-outline fr-icon-question-fill fr-btn--icon-left">
                Besoin d&apos;aide ?
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
