import { contentCguPage } from "@/content";
import { richTextParser } from "@/lib/utils";

export default function Cgu() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {contentCguPage.title}
        </h1>
        <p>{contentCguPage.header}</p>

        <h2>{contentCguPage.presentation}</h2>
        {contentCguPage.presentation_paragraphes.map(
          (par: string, index: number) => (
            <p key={index}>{par}</p>
          )
        )}
        <ul className="">
          {contentCguPage.presentation_fonctionnalites.map(
            (fonctionnalite: string, index: number) => (
              <li key={index} className="">
                {fonctionnalite}
              </li>
            )
          )}
        </ul>

        <h2>{contentCguPage.definition}</h2>
        {contentCguPage.definition_paragraphes.map(
          (par: string, index: number) => (
            <p key={index}>{par}</p>
          )
        )}

        <h2>{contentCguPage.fonctionnalites}</h2>
        <h3>{contentCguPage.fonctionnalites_sans_compte}</h3>
        <p>{contentCguPage.fonctionnalites_sans_compte_p1}</p>
        <p>{contentCguPage.fonctionnalites_sans_compte_p2}</p>
        <ul className="">
          {contentCguPage.fonctionnalites_sans_compte_fonctionnalites.map(
            (fonctionnalite: string, index: number) => (
              <li key={index} className="">
                {fonctionnalite}
              </li>
            )
          )}
        </ul>
        <h3>{contentCguPage.fonctionnalites_avec_compte}</h3>
        <p>{contentCguPage.fonctionnalites_avec_compte_p1}</p>
        <h4>{contentCguPage.fonctionnalites_avec_compte_creation}</h4>
        <p>{contentCguPage.fonctionnalites_avec_compte_creation_description}</p>
        <h4>{contentCguPage.fonctionnalites_avec_compte_dossier}</h4>
        <p>
          {contentCguPage.fonctionnalites_avec_compte_dossier_experimentation}
        </p>
        <p>
          {richTextParser(
            contentCguPage.fonctionnalites_avec_compte_dossier_ds
          )}
        </p>
        <p>
          {contentCguPage.fonctionnalites_avec_compte_dossier_fonctionnalite}
        </p>
        <ul className="">
          {contentCguPage.fonctionnalites_avec_compte_dossier_fonctionnalite_liste.map(
            (fonctionnalite: string, index: number) => (
              <li key={index} className="">
                {fonctionnalite}
              </li>
            )
          )}
        </ul>
        {contentCguPage.fonctionnalites_avec_compte_dossier_paragraphes.map(
          (par: string, index: number) => (
            <p key={index}>{par}</p>
          )
        )}

        <h2>{contentCguPage.traitement_donnee}</h2>
        <p>{richTextParser(contentCguPage.traitement_donnee_description)}</p>

        <h2>{contentCguPage.engagements}</h2>
        {contentCguPage.engagements_descriptions.map(
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

        <h2>{contentCguPage.evolutions}</h2>
        {contentCguPage.evolutions_descriptions.map(
          (par: string, index: number) => (
            <p key={index}>{par}</p>
          )
        )}

        <h2>{contentCguPage.contact}</h2>
        <p>{contentCguPage.contact_description}</p>
      </div>
    </section>
  );
}
