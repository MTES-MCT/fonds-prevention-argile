import Link from "next/link";
import { RgaFooter } from "../RgaFooter/RgaFooter";

const Footer = () => {
  return (
    <footer className="fr-footer" role="contentinfo" id="footer-main">
        <div className="fr-footer__top">
          <div className="fr-container">
            <RgaFooter />
          </div>
        </div>
        <div className="fr-container">
          <div className="fr-footer__body">
            <div className="fr-footer__brand fr-enlarge-link">
              <Link href="/" title="Accueil - Fonds prévention argile - Ministère<br>de la transition<br>écologique">
                <p className="fr-logo">
                  Ministère
                  <br />
                  de la transition
                  <br />
                  écologique
                </p>
              </Link>
            </div>
            <div className="fr-footer__content">
              <div className="fr-footer__content-desc [&_a]:after:content-none!">
                Fonds prévention argile est une plateforme numérique conçue par la{" "}
                <Link
                  href="https://www.ecologie.gouv.fr/direction-generale-lamenagement-du-logement-et-nature-dgaln-0"
                  rel="noopener noreferrer"
                  target="_blank">
                  Direction générale de l'aménagement, du logement et de la nature (DGALN)
                </Link>{" "}
                en partenariat avec le programme{" "}
                <a href="https://beta.gouv.fr/" rel="noopener noreferrer" target="_blank">
                  beta.gouv
                </a>{" "}
                de la{" "}
                <a href="https://www.numerique.gouv.fr/" rel="noopener noreferrer" target="_blank">
                  DINUM
                </a>
                . Le Fonds de Prévention Argile est en phase d'expérimentation, n'hésitez pas à nous faire part de vos
                retours par mail à contact@fonds-prevention-argile.beta.gouv.fr
              </div>
            </div>
          </div>
          <div className="fr-footer__bottom">
            <ul className="fr-footer__bottom-list">
              <li className="fr-footer__bottom-item" key="mentions-legales">
                <Link className="fr-footer__bottom-link" href="/mentions-legales">
                  Mentions légales
                </Link>
              </li>
              <li className="fr-footer__bottom-item" key="politique-confidentialite">
                <Link className="fr-footer__bottom-link" href="/politique-confidentialite">
                  Politique de confidentialité
                </Link>
              </li>
              <li className="fr-footer__bottom-item" key="cgu">
                <Link className="fr-footer__bottom-link" href="/cgu">
                  CGU
                </Link>
              </li>
              <li className="fr-footer__bottom-item" key="accessibilite">
                <Link className="fr-footer__bottom-link" href="/accessibilite">
                  Accessibilité : non conforme
                </Link>
              </li>
              <li className="fr-footer__bottom-item" key="integration-iframe">
                <Link className="fr-footer__bottom-link" href="/documentation/integration-iframe">
                  Intégrer le simulateur sur son site
                </Link>
              </li>
            </ul>
            <div className="fr-footer__bottom-copy">
              <p>
                Sauf mention explicite de propriété intellectuelle détenue par des tiers, les contenus de ce site sont
                proposés sous{" "}
                <Link
                  href="https://github.com/etalab/licence-ouverte/blob/master/LO.md"
                  rel="noopener noreferrer"
                  target="_blank">
                  licence etalab-2.0
                </Link>
              </p>
            </div>
          </div>
        </div>
    </footer>
  );
};

export default Footer;
