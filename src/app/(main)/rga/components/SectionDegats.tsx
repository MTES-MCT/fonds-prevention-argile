import commonContent from "../content/common.json";

export function SectionDegats() {
  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>
          {commonContent.degats.emoji} {commonContent.degats.title}
        </h2>
        {commonContent.degats.content.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
