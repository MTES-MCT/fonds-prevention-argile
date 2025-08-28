import { contentSimulationPage } from "@/content";

export default function Simulateur() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {contentSimulationPage.title}
        </h1>
        <p>TODO</p>
      </div>
    </section>
  );
}
