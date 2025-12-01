import commonContent from "../content/common.json";

export function SectionCoutInaction() {
  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>
          {commonContent.coutInaction.emoji} {commonContent.coutInaction.title}
        </h2>
        {commonContent.coutInaction.content.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
