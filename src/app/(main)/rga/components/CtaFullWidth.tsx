import commonContent from "../content/common.json";

export function CtaFullWidth() {
  return (
    <section className="fr-py-4w" style={{ backgroundColor: "#f5f5fe" }}>
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--middle">
          <div className="fr-col-12 fr-col-md-6">
            <p className="fr-text--lead">{commonContent.cta.fullWidth.text}</p>
            <a className="fr-btn" href={commonContent.cta.fullWidth.buttonLink}>
              {commonContent.cta.fullWidth.buttonLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
