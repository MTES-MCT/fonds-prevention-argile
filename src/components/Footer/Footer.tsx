import Link from "next/link";

import { richTextParser } from "@/lib/utils";
import { contentLayout } from "@/content";

const Footer = () => {
  return (
    <footer className="fr-footer" role="contentinfo" id="footer-7361">
      <div className="fr-container">
        <div className="fr-footer__body">
          <div className="fr-footer__brand fr-enlarge-link">
            <Link
              href={contentLayout.footer.organizationLink}
              title={`Accueil - ${contentLayout.footer.organizationName} - ${contentLayout.footer.affiliatedMinistry}`}
            >
              <p className="fr-logo">
                {richTextParser(contentLayout.footer.affiliatedMinistry)}
              </p>
            </Link>
          </div>
          <div className="fr-footer__content">
            <div className="fr-footer__content-desc [&_a]:after:content-none!">
              {richTextParser(contentLayout.footer.organizationDescription)}
            </div>
          </div>
        </div>
        <div className="fr-footer__bottom">
          <ul className="fr-footer__bottom-list">
            {contentLayout.footer.buttons.map((button, index) => (
              <li className="fr-footer__bottom-item" key={index}>
                <Link className="fr-footer__bottom-link" href={button.href}>
                  {button.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="fr-footer__bottom-copy">
            <p>{richTextParser(contentLayout.footer.bottom_copy_line)}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
