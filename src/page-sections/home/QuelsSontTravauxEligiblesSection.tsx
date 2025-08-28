import { contentHomePage } from "@/content";

export default function QuelsSontTravauxEligiblesSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <h1>{contentHomePage.quels_sont_travaux_eligibles_section.title}</h1>
        <div className="fr-tabs">
          <ul className="fr-tabs__list" role="tablist" aria-label="">
            {contentHomePage.quels_sont_travaux_eligibles_section.tabs.map(
              (tab, index) => (
                <li key={index} role="presentation">
                  <button
                    type="button"
                    id={`tab-${index}`}
                    className="fr-tabs__tab"
                    tabIndex={index === 0 ? 0 : -1}
                    role="tab"
                    aria-selected={index === 0 ? "true" : "false"}
                    aria-controls={`tab-${index}-panel`}
                  >
                    {tab.title}
                  </button>
                </li>
              )
            )}
          </ul>
          {contentHomePage.quels_sont_travaux_eligibles_section.tabs.map(
            (tab, index) => (
              <div
                id={`tab-${index}-panel`}
                key={index}
                className={`fr-tabs__panel ${index === 0 ? "fr-tabs__panel--selected" : ""}`}
                role="tabpanel"
                aria-labelledby={`tab-${index}`}
                tabIndex={0}
              >
                <ul>
                  {tab.textList.map((item, textIndex) => (
                    <li key={textIndex}>{item.text}</li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
