import { contentLegalNoticePage } from "@/content";
import { richTextParser } from "@/lib/utils";

export default function MentionsLegales() {
  return (
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
        <p>{contentLegalNoticePage.editor_telephone}</p>
        <h2>{contentLegalNoticePage.publication_director}</h2>
        <p>{contentLegalNoticePage.publication_director_description}</p>
        <h2>{contentLegalNoticePage.hosting_provider}</h2>
        <p>
          {richTextParser(contentLegalNoticePage.hosting_provider_description)}
        </p>
        <p>
          {richTextParser(contentLegalNoticePage.hosting_provider_address)}
        </p>
        <p>
          {richTextParser(contentLegalNoticePage.hosting_provider_email)}
        </p>
        <h2>{contentLegalNoticePage.nous_contacter}</h2>
        <p>{richTextParser(contentLegalNoticePage.nous_contacter_description)}</p>
      </div>
    </section>
  );
}
