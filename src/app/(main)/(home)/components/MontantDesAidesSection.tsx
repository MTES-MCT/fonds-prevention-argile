import content from "../content/content.json";
import PlafondsSubventionsTable from "./PlafondsSubventionsTable";

export default function MontantDesAidesSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        <h2>{content.montant_des_aides_section.title}</h2>
        <p>
          {content.montant_des_aides_section.description.text}
          <a href={content.montant_des_aides_section.description.linkUrl} target="_blank" rel="noopener noreferrer">
            {content.montant_des_aides_section.description.linkText}
          </a>
          .
        </p>

        {/* Tableau Taux de subvention de l'État */}
        <h3 className="fr-mt-6w">{content.montant_des_aides_section.table.title}</h3>
        <div className="fr-table fr-table--bordered fr-col-md-10" id="table-5-component">
          <div className="fr-table__wrapper">
            <div className="fr-table__container">
              <div className="fr-table__content">
                <table id="table-5">
                  <thead>
                    <tr>
                      <th></th>
                      <th>
                        {content.montant_des_aides_section.table.headers[0].text}
                        <p
                          className={`fr-badge fr-ml-2w ${content.montant_des_aides_section.table.headers[0].badgeColor}`}>
                          {content.montant_des_aides_section.table.headers[0].badge}
                        </p>
                      </th>
                      <th>
                        {content.montant_des_aides_section.table.headers[1].text}
                        <p
                          className={`fr-badge fr-ml-2w ${content.montant_des_aides_section.table.headers[1].badgeColor}`}>
                          {content.montant_des_aides_section.table.headers[1].badge}
                        </p>
                      </th>
                      <th>
                        {content.montant_des_aides_section.table.headers[2].text}
                        <p
                          className={`fr-badge fr-ml-2w ${content.montant_des_aides_section.table.headers[2].badgeColor}`}>
                          {content.montant_des_aides_section.table.headers[2].badge}
                        </p>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.montant_des_aides_section.table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} id={`table-5-row-key-${rowIndex}`}>
                        <td> {row.type} </td>
                        <td> {row.tres_modeste} </td>
                        <td> {row.modeste} </td>
                        <td> {row.intermediaire} </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau Plafonds des subventions (avec dropdown départements) */}
        <PlafondsSubventionsTable />
      </div>
    </section>
  );
}
