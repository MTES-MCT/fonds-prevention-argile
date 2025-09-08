import { contentHomePage } from "@/content";
import Image from "next/image";
import Link from "next/link";

export default function PourEnSavoirPlusSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-grey)]">
      <div className="fr-container">
        <h2>{contentHomePage.pour_en_savoir_plus_section.title}</h2>
        <div className="fr-grid-row fr-grid-row--gutters">
          {contentHomePage.pour_en_savoir_plus_section.cards.map(
            (card, index) => (
              <div
                key={`${index}-card`}
                className="fr-col-12 fr-col-md-6 fr-col-lg-3"
              >
                <div className="fr-card fr-enlarge-link">
                  <div className="fr-card__body">
                    <div className="fr-card__content">
                      <h3 className="fr-card__title">
                        <Link
                          href={card.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {card.title}
                        </Link>
                      </h3>
                      <p className="fr-card__desc">{card.description}</p>
                    </div>
                  </div>
                  <div className="fr-card__header">
                    <div className="fr-card__img">
                      <Image
                        className="fr-responsive-img"
                        src={card.imageUrl}
                        alt={card.imageAlt}
                        width={350}
                        height={125}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
