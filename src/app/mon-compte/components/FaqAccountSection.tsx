export default function FaqAccountSection() {
  const faq_section = {
    title: "Questions fréquentes",
    faqs: [
      {
        question: "Quelles sont les étapes ?",
        answer:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      },
      {
        question:
          "Quels sont les délais entre la fin des travaux et le paiement ?",
        answer:
          "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      },
      {
        question: "Combien de temps dure l’instruction ?",
        answer:
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      },
      {
        question:
          "Que faire si les informations de mon habitation sont erronées ?",
        answer:
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      },
      {
        question: "Comment puis-je modifier mon dossier ?",
        answer:
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      },
      {
        question: "Où sont mes formulaires ?",
        answer:
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      },
      {
        question: "Qu’est-ce que demarches-simplifiees.fr, est-ce sûr ?",
        answer:
          "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      },
    ],
  };

  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--gutters">
          {/* Zone gauche - 1/3 */}
          <div className="fr-col-12 fr-col-lg-4">
            <h2>Questions fréquentes</h2>
          </div>

          {/* Zone droite - 2/3 */}
          <div className="fr-col-12 fr-col-lg-8">
            <div data-fr-group="true" className="fr-accordions-group">
              {faq_section.faqs.map((faq, index) => (
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
