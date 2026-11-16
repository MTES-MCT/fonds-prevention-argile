import { redirect } from "next/navigation";
import { checkAgentAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { isAdminRole } from "@/shared/domain/value-objects";
import { LIBELLES_NOTE, NOTES_AVIS, estNoteAvis } from "@/features/avis/domain/value-objects/avis";
import { SEUIL_REPONSES } from "@/features/backoffice/administration/satisfaction/domain/satisfaction";
import { getSatisfaction } from "@/features/backoffice/administration/satisfaction/services/satisfaction.service";
import { AdminBreadcrumb } from "../shared/components/AdminBreadcrumb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });

export default async function SatisfactionPage() {
  const access = await checkAgentAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  if (!access.hasAccess || !access.user) {
    return <AccesNonAutoriseAdmin />;
  }

  // Un commentaire est un texte libre qui peut nommer une personne : réservé aux administrateurs.
  const { stats, commentaires } = await getSatisfaction({ avecCommentaires: isAdminRole(access.user.role) });

  return (
    <>
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Satisfaction" />
          <h1 className="fr-h2 fr-mb-1v">Satisfaction</h1>
          <p className="fr-mb-6w" style={{ color: "var(--text-mention-grey)" }}>
            Avis donnés par les demandeurs après chaque étape et sous le résultat des simulateurs, depuis le début
          </p>
        </div>
      </section>

      <section className="fr-container fr-py-6w">
        <div className="fr-table">
          <div className="fr-table__wrapper">
            <div className="fr-table__container">
              <div className="fr-table__content">
                <table>
                  <caption>
                    Avis par sujet
                    <div className="fr-table__caption__desc">
                      Note moyenne sur 5 et part des réponses « Facile » ou « Très facile », affichées à partir de{" "}
                      {SEUIL_REPONSES} réponses.
                    </div>
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Sujet</th>
                      <th scope="col">Réponses</th>
                      {NOTES_AVIS.map((note) => (
                        <th scope="col" key={note}>
                          {LIBELLES_NOTE[note]}
                        </th>
                      ))}
                      <th scope="col">Note moyenne</th>
                      <th scope="col">Faciles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((stat) => (
                      <tr key={stat.sujet}>
                        <th scope="row">{stat.libelle}</th>
                        <td>{stat.reponses.toLocaleString("fr-FR")}</td>
                        {NOTES_AVIS.map((note) => (
                          <td key={note}>{stat.repartition[note].toLocaleString("fr-FR")}</td>
                        ))}
                        <td>{stat.noteMoyenne === null ? "—" : stat.noteMoyenne.toLocaleString("fr-FR")}</td>
                        <td>{stat.partFacile === null ? "—" : `${stat.partFacile} %`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {commentaires && (
          <>
            <h2 className="fr-h4 fr-mt-6w">Commentaires</h2>
            {commentaires.length === 0 ? (
              <p>Aucun commentaire pour le moment.</p>
            ) : (
              <div className="fr-table">
                <div className="fr-table__wrapper">
                  <div className="fr-table__container">
                    <div className="fr-table__content">
                      <table>
                        <caption className="fr-sr-only">
                          Commentaires des demandeurs, du plus récent au plus ancien
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Date</th>
                            <th scope="col">Sujet</th>
                            <th scope="col">Réponse</th>
                            <th scope="col">Commentaire</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commentaires.map((ligne) => (
                            <tr key={ligne.id}>
                              <td>{DATE.format(new Date(ligne.date))}</td>
                              <td>{ligne.libelle}</td>
                              <td>{estNoteAvis(ligne.note) ? LIBELLES_NOTE[ligne.note] : ligne.note}</td>
                              <td style={{ whiteSpace: "pre-wrap" }}>{ligne.commentaire}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
