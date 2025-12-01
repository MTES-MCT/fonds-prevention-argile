import content from "./content/content.json";
import { richTextParser } from "@/shared/utils";

export default function Cgu() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {content.title}
        </h1>
        <p>{content.header}</p>

        <h2>{content.presentation}</h2>
        {content.presentation_paragraphes.map((par: string, index: number) => (
          <p key={index}>{par}</p>
        ))}
        <ul className="">
          {content.presentation_fonctionnalites.map(
            (fonctionnalite: string, index: number) => (
              <li key={index} className="">
                {fonctionnalite}
              </li>
            )
          )}
        </ul>

        <h2>{content.definition}</h2>
        {content.definition_paragraphes.map((par: string, index: number) => (
          <p key={index}>{par}</p>
        ))}

        <h2>{content.fonctionnalites}</h2>
        <h3>{content.fonctionnalites_sans_compte}</h3>
        <p>{content.fonctionnalites_sans_compte_p1}</p>
        <p>{content.fonctionnalites_sans_compte_p2}</p>
        <ul className="">
          {content.fonctionnalites_sans_compte_fonctionnalites.map(
            (fonctionnalite: string, index: number) => (
              <li key={index} className="">
                {fonctionnalite}
              </li>
            )
          )}
        </ul>
        <h3>{content.fonctionnalites_avec_compte}</h3>
        <p>{content.fonctionnalites_avec_compte_p1}</p>
        <h4>{content.fonctionnalites_avec_compte_creation}</h4>
        <p>{content.fonctionnalites_avec_compte_creation_description}</p>
        <h4>{content.fonctionnalites_avec_compte_dossier}</h4>
        <p>{content.fonctionnalites_avec_compte_dossier_experimentation}</p>
        <p>{richTextParser(content.fonctionnalites_avec_compte_dossier_ds)}</p>
        <p>{content.fonctionnalites_avec_compte_dossier_fonctionnalite}</p>
        <ul className="">
          {content.fonctionnalites_avec_compte_dossier_fonctionnalite_liste.map(
            (fonctionnalite: string, index: number) => (
              <li key={index} className="">
                {fonctionnalite}
              </li>
            )
          )}
        </ul>
        {content.fonctionnalites_avec_compte_dossier_paragraphes.map(
          (par: string, index: number) => (
            <p key={index}>{par}</p>
          )
        )}

        <h2>{content.traitement_donnee}</h2>
        <p>{richTextParser(content.traitement_donnee_description)}</p>

        <h2>{content.engagements}</h2>
        {content.engagements_descriptions.map(
          (
            engagement: { title: string; descriptions: string[] },
            index: number
          ) => (
            <div key={index}>
              <h3>{engagement.title}</h3>
              {engagement.descriptions.map(
                (descr: string, descrIndex: number) => (
                  <p key={descrIndex}>{descr}</p>
                )
              )}
            </div>
          )
        )}

        <h2>{content.evolutions}</h2>
        {content.evolutions_descriptions.map((par: string, index: number) => (
          <p key={index}>{par}</p>
        ))}

        <h2>{content.contact}</h2>
        <p>{content.contact_description}</p>
      </div>
    </section>
  );
}
