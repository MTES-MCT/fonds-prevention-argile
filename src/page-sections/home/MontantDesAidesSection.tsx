import { contentHomePage } from "@/content";
import { richTextParser } from "@/lib/utils";

export default function MontantDesAidesSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        <h2>{contentHomePage.montant_des_aides_section.title}</h2>
        <p>
          {contentHomePage.montant_des_aides_section.description.text}
          <a
            href={contentHomePage.montant_des_aides_section.description.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {contentHomePage.montant_des_aides_section.description.linkText}
          </a>
        </p>
        <div className="fr-callout">
          <h3 className="fr-callout__title">
            {contentHomePage.montant_des_aides_section.highlight.title}
          </h3>
          <p className="fr-callout__text">
            {richTextParser(
              contentHomePage.montant_des_aides_section.highlight.text
            )}
          </p>
        </div>
        <div className="fr-table fr-table--bordered" id="table-5-component">
          <div className="fr-table__wrapper">
            <div className="fr-table__container">
              <div className="fr-table__content">
                <table id="table-5">
                  <caption>
                    {contentHomePage.montant_des_aides_section.table.title}
                  </caption>
                  <thead>
                    <tr>
                      <th></th>
                      <th>
                        {
                          contentHomePage.montant_des_aides_section.table
                            .headers[0].text
                        }
                        <p
                          className={`fr-badge fr-ml-2w ${contentHomePage.montant_des_aides_section.table.headers[0].badgeColor}`}
                        >
                          {
                            contentHomePage.montant_des_aides_section.table
                              .headers[0].badge
                          }
                        </p>
                      </th>
                      <th>
                        {
                          contentHomePage.montant_des_aides_section.table
                            .headers[1].text
                        }
                        <p
                          className={`fr-badge fr-ml-2w ${contentHomePage.montant_des_aides_section.table.headers[1].badgeColor}`}
                        >
                          {
                            contentHomePage.montant_des_aides_section.table
                              .headers[1].badge
                          }
                        </p>
                      </th>
                      <th>
                        {
                          contentHomePage.montant_des_aides_section.table
                            .headers[2].text
                        }
                        <p
                          className={`fr-badge fr-ml-2w ${contentHomePage.montant_des_aides_section.table.headers[2].badgeColor}`}
                        >
                          {
                            contentHomePage.montant_des_aides_section.table
                              .headers[2].badge
                          }
                        </p>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentHomePage.montant_des_aides_section.table.rows.map(
                      (row, rowIndex) => (
                        <tr key={rowIndex} id={`table-5-row-key-${rowIndex}`}>
                          <td> {row.type} </td>
                          <td> {row.tres_modeste} </td>
                          <td> {row.modeste} </td>
                          <td> {row.intermediaire} </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
