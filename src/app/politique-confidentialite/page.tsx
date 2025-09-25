import { contentLegalNoticePage } from "@/content";
import { richTextParser } from "@/lib/utils";

export default function PolitiqueConfidentialite() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {confidentialitePage.title}
        </h1>
        
        <h2>{confidentialitePage.responsable}</h2>
        {confidentialitePage.responsable_descriptions.map((par, index) => (
          <p>{par}</p>
        ))}

        <h2>{confidentialitePage.pourquoi}</h2>
        <p>{confidentialitePage.pourquoi_header}</p>
        {confidentialitePage.pourquoi_descriptions.map((par, index) => (
          <p>{par}</p>
        ))}

        <h2>{confidentialitePage.donnees}</h2>
        <p>{confidentialitePage.donnees_header}</p>
        {confidentialitePage.donnees_descriptions.map((par, index) => (
          <p>{richTextParser(par)}</p>
        ))}

        <h2>{confidentialitePage.autorisation}</h2>
        {confidentialitePage.autorisation_descriptions.map((par, index) => (
          <p>{richTextParser(par)}</p>
        ))}

        <h2>{confidentialitePage.duree}</h2>
        <table id="table-5">
          <thead>
            <tr>
              <th>{confidentialitePage.duree_categorie}</th>
              <th>{confidentialitePage.duree_temps}
            </tr>
          </thead>
          <tbody>
            {confidentialitePage.duree_descriptions.map(
              (row, rowIndex) => (
                <tr key={rowIndex} id={`table-5-row-key-${rowIndex}`}>
                  <td> {row.categorie} </td>
                  <td> {row.duree} </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        <h2>{confidentialitePage.droits}</h2>
        <p>{confidentialitePage.droits_header}</p>
        <ul className="">
          {confidentialitePage.droits_descriptions.map((droit, index) => (
            <li key={index} className="">
              {droit}
            </li>
          ))}
        </ul>
        {confidentialitePage.droits_paragraphes.map((par, index) => (
          <p>{richTextParser(par)}</p>
        ))}


        <h2>{confidentialitePage.acces}</h2>
        <p>{confidentialitePage.acces_header}<p>
        <ul className="">
          {confidentialitePage.acces_valeurs.map((acces, index) => (
            <li key={index} className="">
              {acces}
            </li>
          ))}
        </ul>

        <h2>{confidentialitePage.sous_traitant}</h2>
        <p>{confidentialitePage.sous_traitant_header}</p>
        <table id="table-5">
          <thead>
            <tr>
              {confidentialitePage.sous_traitant_heading.map((header, Index) => (
                <th>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {confidentialitePage.sous_traitant_valeurs.map(
              (row, rowIndex) => (
                <tr key={rowIndex} id={`table-5-row-key-${rowIndex}`}>
                  <td> {row.title} </td>
                  <td> {row.traitement} </td>
                  <td> {row.pays} </td>
                  <td> {richTextParser(row.lien)} </td>
                </tr>
              )
            )}
          </tbody>
        </table> 

        <h2>{confidentialitePage.cookies}</h2>
        {confidentialitePage.cookies_descriptions.map((par, index) => (
          <p>{par}</p>
        ))}
      </div>
    </section>
  );
}
