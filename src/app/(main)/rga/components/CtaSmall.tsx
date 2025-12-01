import commonContent from "../content/common.json";

export function CtaSmall() {
  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <div className="fr-callout">
          <p className="fr-callout__text">{commonContent.cta.small.text}</p>
          <a className="fr-btn" href={commonContent.cta.small.buttonLink}>
            {commonContent.cta.small.buttonLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
