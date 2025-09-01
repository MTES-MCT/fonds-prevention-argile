import { notFound } from "next/navigation";
import { getDemarchesSimplifieesClient } from "@/lib/api/demarches-simplifiees";
import { richTextParser } from "@/lib/utils";

// Fonction pour formater les états
function getStateLabel(state: string): string {
  const stateLabels: Record<string, string> = {
    en_construction: "En construction",
    en_instruction: "En instruction",
    accepte: "Accepté",
    refuse: "Refusé",
    sans_suite: "Sans suite",
  };
  return stateLabels[state] || state;
}

// Fonction pour obtenir la classe CSS du badge selon l'état
function getStateBadgeClass(state: string): string {
  const stateClasses: Record<string, string> = {
    en_construction: "fr-badge--new",
    en_instruction: "fr-badge--info",
    accepte: "fr-badge--success",
    refuse: "fr-badge--error",
    sans_suite: "fr-badge--warning",
  };
  return `fr-badge ${stateClasses[state] || ""}`;
}

// Fonction pour formater une date avec heure
function formatDateTime(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fonction pour formater une date simple
function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function DossierDetailPage() {
  // ID en dur pour l'instant
  // TODO : a remplacer plus tard
  const dossierId = 25953373;

  const client = getDemarchesSimplifieesClient();
  const dossier = await client.getDossier(dossierId);

  if (!dossier) {
    notFound();
  }

  return (
    <section className="fr-container fr-py-6w">
      {/* En-tête avec navigation */}
      <nav
        role="navigation"
        className="fr-breadcrumb"
        aria-label="vous êtes ici :"
      >
        <button
          className="fr-breadcrumb__button"
          aria-expanded="false"
          aria-controls="breadcrumb"
        >
          Voir le fil d'Ariane
        </button>
        <div className="fr-collapse" id="breadcrumb">
          <ol className="fr-breadcrumb__list">
            <li>
              <a className="fr-breadcrumb__link" href="/admin">
                Tableau de bord
              </a>
            </li>
            <li>
              <a className="fr-breadcrumb__link" aria-current="page">
                Dossier n°{dossier.number}
              </a>
            </li>
          </ol>
        </div>
      </nav>

      {/* Titre et état */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-12">
          <div className="fr-grid-row fr-grid-row--middle">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-2w">Dossier n°{dossier.number}</h1>
              <p
                className={`${getStateBadgeClass(dossier.state)} fr-badge--lg`}
              >
                {getStateLabel(dossier.state)}
              </p>
              {dossier.archived && (
                <span className="fr-badge fr-badge--sm fr-badge--warning fr-ml-2w">
                  Archivé
                </span>
              )}
            </div>
            <div className="fr-col-auto">
              <div className="fr-btns-group fr-btns-group--inline">
                <button className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-download-line">
                  Télécharger
                </button>
                <button className="fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-printer-line">
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card fr-card--no-arrow">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h3 className="fr-card__title">
                  <span
                    className="fr-icon-calendar-line fr-mr-1w"
                    aria-hidden="true"
                  ></span>
                  Dates clés
                </h3>
                <div className="fr-card__desc">
                  <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                    Dépôt
                  </p>
                  <p className="fr-text--md fr-mb-2w">
                    {dossier.datePassageEnConstruction
                      ? formatDate(dossier.datePassageEnConstruction)
                      : "NC"}
                  </p>

                  {dossier.datePassageEnInstruction && (
                    <>
                      <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                        Passage en instruction
                      </p>
                      <p className="fr-text--md fr-mb-2w">
                        {formatDate(dossier.datePassageEnInstruction)}
                      </p>
                    </>
                  )}

                  {dossier.dateTraitement && (
                    <>
                      <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                        Traitement
                      </p>
                      <p className="fr-text--md">
                        {formatDate(dossier.dateTraitement)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card fr-card--no-arrow">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h3 className="fr-card__title">
                  <span
                    className="fr-icon-user-line fr-mr-1w"
                    aria-hidden="true"
                  ></span>
                  Usager
                </h3>
                <div className="fr-card__desc">
                  {dossier.usager ? (
                    <>
                      <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                        Email
                      </p>
                      <p className="fr-text--md fr-mb-0">
                        {dossier.usager.email}
                      </p>
                    </>
                  ) : (
                    <p className="fr-text--sm fr-text--mention-grey">
                      Informations non disponibles
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card fr-card--no-arrow">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h3 className="fr-card__title">
                  <span
                    className="fr-icon-account-circle-line fr-mr-1w"
                    aria-hidden="true"
                  ></span>
                  Instructeurs
                </h3>
                <div className="fr-card__desc">
                  {dossier.instructeurs && dossier.instructeurs.length > 0 ? (
                    <ul
                      className="fr-text--sm fr-p-0"
                      style={{ listStyle: "none" }}
                    >
                      {dossier.instructeurs.map((instructeur) => (
                        <li key={instructeur.id} className="fr-mb-1v">
                          {instructeur.email}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fr-text--sm fr-text--mention-grey">
                      Aucun instructeur assigné
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper pour visualiser l'état du dossier */}
      <div className="fr-stepper fr-mb-6w">
        <h2 className="fr-stepper__title">
          <span className="fr-stepper__state">État du dossier</span>
        </h2>
        <div
          className="fr-stepper__steps"
          data-fr-current-step={
            dossier.state === "en_construction"
              ? "1"
              : dossier.state === "en_instruction"
                ? "2"
                : ["accepte", "refuse", "sans_suite"].includes(dossier.state)
                  ? "3"
                  : "1"
          }
          data-fr-steps="3"
        >
          <h3 className="fr-stepper__details">
            <span className="fr-text--bold">
              {dossier.state === "en_construction" && "Étape 1 sur 3"}
              {dossier.state === "en_instruction" && "Étape 2 sur 3"}
              {["accepte", "refuse", "sans_suite"].includes(dossier.state) &&
                "Étape 3 sur 3 - Terminé"}
            </span>
          </h3>
        </div>
      </div>

      {/* Timeline détaillée de l'évolution du dossier */}
      {/* Timeline détaillée de l'évolution du dossier */}
      <div className="fr-callout fr-mb-6w">
        <h3 className="fr-callout__title">
          <span
            className="fr-icon-time-line fr-mr-1w"
            aria-hidden="true"
          ></span>
          Historique du dossier
        </h3>
        <div className="fr-callout__text">
          <div className="fr-timeline">
            <ul>
              <li>
                <strong>En construction</strong>
                {dossier.datePassageEnConstruction && (
                  <p className="fr-text--sm fr-mb-0">
                    {formatDate(dossier.datePassageEnConstruction)}
                  </p>
                )}
              </li>
              {dossier.datePassageEnInstruction && (
                <li>
                  <strong>En instruction</strong>
                  <p className="fr-text--sm fr-mb-0">
                    {formatDate(dossier.datePassageEnInstruction)}
                  </p>
                </li>
              )}
              {dossier.dateTraitement && (
                <li>
                  <strong>
                    {dossier.state === "accepte" && "✅ Accepté"}
                    {dossier.state === "refuse" && "❌ Refusé"}
                    {dossier.state === "sans_suite" && "⚠️ Sans suite"}
                  </strong>
                  <p className="fr-text--sm fr-mb-0">
                    {formatDate(dossier.dateTraitement)}
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs pour les différentes sections */}
      <div className="fr-tabs">
        <ul
          className="fr-tabs__list"
          role="tablist"
          aria-label="Sections du dossier"
        >
          <li role="presentation">
            <button
              id="tabpanel-champs"
              className="fr-tabs__tab"
              tabIndex={0}
              role="tab"
              aria-selected="true"
              aria-controls="tabpanel-champs-panel"
            >
              Formulaire
            </button>
          </li>
          <li role="presentation">
            <button
              id="tabpanel-messages"
              className="fr-tabs__tab"
              tabIndex={-1}
              role="tab"
              aria-selected="false"
              aria-controls="tabpanel-messages-panel"
            >
              Messages ({dossier.messages?.length || 0})
            </button>
          </li>
          <li role="presentation">
            <button
              id="tabpanel-annotations"
              className="fr-tabs__tab"
              tabIndex={-1}
              role="tab"
              aria-selected="false"
              aria-controls="tabpanel-annotations-panel"
            >
              Annotations
            </button>
          </li>
        </ul>

        {/* Panel Formulaire */}
        <div
          id="tabpanel-champs-panel"
          className="fr-tabs__panel fr-tabs__panel--selected"
          role="tabpanel"
          aria-labelledby="tabpanel-champs"
          tabIndex={0}
        >
          <div className="fr-table fr-mt-3w">
            <table>
              <caption className="fr-sr-only">Champs du formulaire</caption>
              <thead>
                <tr>
                  <th scope="col">Label</th>
                  <th scope="col">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {dossier.champs && dossier.champs.length > 0 ? (
                  dossier.champs.map((champ) => (
                    <tr key={champ.id}>
                      <td className="fr-text--bold">{champ.label}</td>
                      <td>{champ.stringValue || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="fr-text--mention-grey">
                      Aucun champ renseigné
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Messages */}
        <div
          id="tabpanel-messages-panel"
          className="fr-tabs__panel"
          role="tabpanel"
          aria-labelledby="tabpanel-messages"
          tabIndex={0}
        >
          <div className="fr-mt-3w">
            {dossier.messages && dossier.messages.length > 0 ? (
              <ul className="fr-timeline-list">
                {dossier.messages.map((message) => (
                  <li key={message.id}>
                    <div className="fr-timeline-content">
                      <h3 className="fr-timeline-title fr-text--sm fr-mb-1w">
                        {message.email}
                      </h3>
                      <p className="fr-text--xs fr-text--mention-grey fr-mb-2w">
                        {formatDateTime(message.createdAt)}
                      </p>
                      <p className="fr-text--sm">
                        {richTextParser(message.body)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fr-text--mention-grey">Aucun message</p>
            )}
          </div>
        </div>

        {/* Panel Annotations */}
        <div
          id="tabpanel-annotations-panel"
          className="fr-tabs__panel"
          role="tabpanel"
          aria-labelledby="tabpanel-annotations"
          tabIndex={0}
        >
          <div className="fr-table fr-mt-3w">
            <table>
              <caption className="fr-sr-only">Annotations du dossier</caption>
              <thead>
                <tr>
                  <th scope="col">Label</th>
                  <th scope="col">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {dossier.annotations && dossier.annotations.length > 0 ? (
                  dossier.annotations.map((annotation) => (
                    <tr key={annotation.id}>
                      <td className="fr-text--bold">{annotation.label}</td>
                      <td>{annotation.stringValue || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="fr-text--mention-grey">
                      Aucune annotation
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section Motivation (si refusé ou sans suite) */}
      {dossier.motivation && (
        <div className="fr-callout fr-callout--brown-caramel fr-mt-6w">
          <h3 className="fr-callout__title">Motivation de la décision</h3>
          <p className="fr-callout__text">{dossier.motivation}</p>
        </div>
      )}

      {/* Actions en bas de page */}
      <div className="fr-mt-6w">
        <div className="fr-btns-group fr-btns-group--inline">
          <a
            href="/admin"
            className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line"
          >
            Retour à la liste
          </a>
        </div>
      </div>
    </section>
  );
}
