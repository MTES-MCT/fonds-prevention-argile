import { contentHomePage } from "@/content";
import Link from "next/link";

export default function FaqSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--gutters">
          {/* Zone gauche - 1/3 */}
          <div className="fr-col-12 fr-col-lg-4">
            <h1>{contentHomePage.faq_section.title}</h1>
            <Link
              id="link-help"
              href={contentHomePage.faq_section.helpLink.url}
              target="_self"
              className="fr-link fr-icon-arrow-right-line fr-link--icon-right"
            >
              {contentHomePage.faq_section.helpLink.label}
            </Link>
          </div>

          {/* Zone droite - 2/3 */}
          <div className="fr-col-12 fr-col-lg-8">
            <div data-fr-group="true" className="fr-accordions-group">
              {contentHomePage.faq_section.faqs.map((faq, index) => (
                <section key={`faq-${index}`} className="fr-accordion">
                  <h3 className="fr-accordion__title">
                    <button
                      type="button"
                      className="fr-accordion__btn"
                      aria-expanded="false"
                      aria-controls={`accordion-id-${index + 1}`}
                    >
                      {faq.question}
                    </button>
                  </h3>
                  <div className="fr-collapse" id={`accordion-id-${index + 1}`}>
                    <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
