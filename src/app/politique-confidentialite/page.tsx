import content from "./content/content.json";
import { richTextParser } from "@/shared/utils";
import Link from "next/link";

export default function PolitiqueConfidentialite() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {content.title}
        </h1>

        <h2>{content.responsable}</h2>
        {content.responsable_descriptions.map((par: string, index: number) => (
          <p key={index}>{par}</p>
        ))}

        <h2>{content.pourquoi}</h2>
        <p>{content.pourquoi_header}</p>
        {content.pourquoi_descriptions.map((par: string, index: number) => (
          <p key={index}>{par}</p>
        ))}

        <h2>{content.donnees}</h2>
        <p>{content.donnees_header}</p>
        {content.donnees_descriptions.map((par: string, index: number) => (
          <p key={index}>{richTextParser(par)}</p>
        ))}

        <h2>{content.autorisation}</h2>
        {content.autorisation_descriptions.map((par: string, index: number) => (
          <p key={index}>{richTextParser(par)}</p>
        ))}

        <h2>{content.duree}</h2>
        <table id="table-5">
          <thead>
            <tr>
              <th>{content.duree_categorie}</th>
              <th>{content.duree_temps}</th>
            </tr>
          </thead>
          <tbody>
            {content.duree_descriptions.map(
              (row: { categorie: string; duree: string }, rowIndex: number) => (
                <tr key={rowIndex} id={`table-5-row-key-${rowIndex}`}>
                  <td>{row.categorie}</td>
                  <td>{row.duree}</td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <h2>{content.droits}</h2>
        <p>{content.droits_header}</p>
        <ul className="">
          {content.droits_descriptions.map((droit: string, index: number) => (
            <li key={index} className="">
              {droit}
            </li>
          ))}
        </ul>
        {content.droits_paragraphes.map((par: string, index: number) => (
          <p key={index}>{richTextParser(par)}</p>
        ))}

        <h2>{content.acces}</h2>
        <p>{content.access_header}</p>
        <ul className="">
          {content.access_valeurs.map((acces: string, index: number) => (
            <li key={index} className="">
              {acces}
            </li>
          ))}
        </ul>

        <h2>{content.sous_traitant}</h2>
        <p>{content.sous_traitant_header}</p>
        <table id="table-6">
          <thead>
            <tr>
              {content.sous_traitant_heading.map(
                (header: string, index: number) => (
                  <th key={index}>{header}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {content.sous_traitant_valeurs.map(
              (
                row: {
                  title: string;
                  traitement: string;
                  pays: string;
                  lien: string;
                },
                rowIndex: number
              ) => (
                <tr key={rowIndex} id={`table-6-row-key-${rowIndex}`}>
                  <td>{row.title}</td>
                  <td>{row.traitement}</td>
                  <td>{row.pays}</td>
                  <td>
                    <Link
                      href={row.lien}
                      className="text-blue-600 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {richTextParser(row.lien)}
                    </Link>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <h2>{content.cookies}</h2>
        {content.cookies_descriptions.map((par: string, index: number) => (
          <p key={index}>{par}</p>
        ))}
      </div>
    </section>
  );
}
