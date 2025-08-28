import { Notice } from "@/components";
import { contentLegalNoticePage } from "@/content";
import { richTextParser } from "@/lib/utils";

export default function MentionsLegales() {
  return (
    <>
      <Notice className="fr-notice--info" description="" title="" />

      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
          <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
            {contentLegalNoticePage.title}
          </h1>
          <h2>{contentLegalNoticePage.editor}</h2>
          <p>{contentLegalNoticePage.editor_description}</p>
          <p>{contentLegalNoticePage.editor_description_2}</p>
          <p>{contentLegalNoticePage.editor_address}</p>
          <p>{contentLegalNoticePage.editor_address_2}</p>
          <h2>{contentLegalNoticePage.publication_director}</h2>
          <p>{contentLegalNoticePage.publication_director_description}</p>
          <h2>{contentLegalNoticePage.hosting_provider}</h2>
          <p>
            {richTextParser(
              contentLegalNoticePage.hosting_provider_description
            )}
          </p>
          <h2>{contentLegalNoticePage.terms_of_use}</h2>
          <p>
            {richTextParser(contentLegalNoticePage.terms_of_use_description)}
          </p>
          <h2>{contentLegalNoticePage.statistics}</h2>
          <p>{contentLegalNoticePage.statistics_description}</p>
          <h2>{contentLegalNoticePage.share_corrections}</h2>
          <p>{contentLegalNoticePage.share_corrections_description}</p>
          <h2>{contentLegalNoticePage.access_data}</h2>
          <p className="fr-mb-1w">
            {contentLegalNoticePage.access_data_description}
          </p>
        </div>
      </section>
    </>
  );
}
