import { contentConfidentialitePage } from "@/content";
import { richTextParser } from "@/lib/utils";
import Link from "next/link";

export default function PolitiqueConfidentialite() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {contentConfidentialitePage.title}
        </h1>

        <h2>{contentConfidentialitePage.responsable}</h2>
        {contentConfidentialitePage.responsable_descriptions.map(
          (par: string, index: number) => (
            <p key={index}>{par}</p>
          )
        )}

        <h2>{contentConfidentialitePage.pourquoi}</h2>
        <p>{contentConfidentialitePage.pourquoi_header}</p>
        {contentConfidentialitePage.pourquoi_descriptions.map(
          (par: string, index: number) => (
            <p key={index}>{par}</p>
          )
        )}

        <h2>{contentConfidentialitePage.donnees}</h2>
        <p>{contentConfidentialitePage.donnees_header}</p>
        {contentConfidentialitePage.donnees_descriptions.map(
          (par: string, index: number) => (
            <p key={index}>{richTextParser(par)}</p>
          )
        )}

        <h2>{contentConfidentialitePage.autorisation}</h2>
        {contentConfidentialitePage.autorisation_descriptions.map(
          (par: string, index: number) => (
            <p key={index}>{richTextParser(par)}</p>
          )
        )}

        <h2>{contentConfidentialitePage.duree}</h2>
        <table id="table-5">
          <thead>
            <tr>
              <th>{contentConfidentialitePage.duree_categorie}</th>
              <th>{contentConfidentialitePage.duree_temps}</th>
            </tr>
          </thead>
          <tbody>
            {contentConfidentialitePage.duree_descriptions.map(
              (row: { categorie: string; duree: string }, rowIndex: number) => (
                <tr key={rowIndex} id={`table-5-row-key-${rowIndex}`}>
                  <td>{row.categorie}</td>
                  <td>{row.duree}</td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <h2>{contentConfidentialitePage.droits}</h2>
        <p>{contentConfidentialitePage.droits_header}</p>
        <ul className="">
          {contentConfidentialitePage.droits_descriptions.map(
            (droit: string, index: number) => (
              <li key={index} className="">
                {droit}
              </li>
            )
          )}
        </ul>
        {contentConfidentialitePage.droits_paragraphes.map(
          (par: string, index: number) => (
            <p key={index}>{richTextParser(par)}</p>
          )
        )}

        <h2>{contentConfidentialitePage.acces}</h2>
        <p>{contentConfidentialitePage.access_header}</p>
        <ul className="">
          {contentConfidentialitePage.access_valeurs.map(
            (acces: string, index: number) => (
              <li key={index} className="">
                {acces}
              </li>
            )
          )}
        </ul>

        <h2>{contentConfidentialitePage.sous_traitant}</h2>
        <p>{contentConfidentialitePage.sous_traitant_header}</p>
        <table id="table-6">
          <thead>
            <tr>
              {contentConfidentialitePage.sous_traitant_heading.map(
                (header: string, index: number) => (
                  <th key={index}>{header}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {contentConfidentialitePage.sous_traitant_valeurs.map(
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

        <h2>{contentConfidentialitePage.cookies}</h2>
        {contentConfidentialitePage.cookies_descriptions.map(
          (par: string, index: number) => (
            <p key={index}>{par}</p>
          )
        )}
      </div>
    </section>
  );
}
