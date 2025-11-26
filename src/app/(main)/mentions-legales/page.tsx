import content from "./content/content.json";
import { richTextParser } from "@/shared/utils";

export default function MentionsLegales() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {content.title}
        </h1>
        <h2>{content.editor}</h2>
        <p>{content.editor_description}</p>
        <p>{content.editor_description_2}</p>
        <p>{content.editor_address}</p>
        <p>{content.editor_address_2}</p>
        <p>{content.editor_telephone}</p>
        <h2>{content.publication_director}</h2>
        <p>{content.publication_director_description}</p>
        <h2>{content.hosting_provider}</h2>
        <p>{richTextParser(content.hosting_provider_description)}</p>
        <p>{richTextParser(content.hosting_provider_address)}</p>
        <p>{richTextParser(content.hosting_provider_email)}</p>
        <h2>{content.nous_contacter}</h2>
        <p>{richTextParser(content.nous_contacter_description)}</p>
      </div>
    </section>
  );
}
