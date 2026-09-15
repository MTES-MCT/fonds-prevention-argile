import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfoDossierCallout } from "./InfoDossierCallout";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

const BASE = {
  currentStep: Step.ELIGIBILITE,
  currentStatus: Status.TODO,
  dsStatus: null,
  instructedAt: null,
  archivedAt: null,
  archiveReason: null,
};

describe("InfoDossierCallout — archivage", () => {
  it("annonce l'archivage et son motif sur un archivage manuel", () => {
    render(
      <InfoDossierCallout
        {...BASE}
        validationStatut={StatutValidationAmo.LOGEMENT_ELIGIBLE}
        archivedAt={new Date("2026-08-27T12:28:40Z")}
        archiveReason="Le demandeur ne donne pas de réponse"
      />
    );

    expect(screen.getByText(/Dossier archivé le/)).toBeInTheDocument();
    expect(screen.getByText(/Le demandeur ne donne pas de réponse/)).toBeInTheDocument();
    expect(screen.queryByText(/pas éligible/)).not.toBeInTheDocument();
  });

  it("garde le message d'inéligibilité quand l'archivage vient de la simulation", () => {
    render(
      <InfoDossierCallout
        {...BASE}
        validationStatut={StatutValidationAmo.LOGEMENT_NON_ELIGIBLE}
        archivedAt={new Date("2026-08-27T12:28:40Z")}
        archiveReason="Non éligible au dispositif"
      />
    );

    expect(screen.getByText(/Dossier archivé — non éligible/)).toBeInTheDocument();
  });

  it("reste muet sur l'archivage quand le dossier est actif", () => {
    render(<InfoDossierCallout {...BASE} validationStatut={StatutValidationAmo.EN_ATTENTE} />);

    expect(screen.queryByText(/archivé/i)).not.toBeInTheDocument();
    expect(screen.getByText(/En attente de validation par l'AMO/)).toBeInTheDocument();
  });

  it("annonce l'archivage même sans motif enregistré", () => {
    render(
      <InfoDossierCallout
        {...BASE}
        validationStatut={StatutValidationAmo.LOGEMENT_ELIGIBLE}
        archivedAt={new Date("2026-08-27T12:28:40Z")}
      />
    );

    expect(screen.getByText(/Dossier archivé le/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun motif n'a été enregistré/)).toBeInTheDocument();
  });
});
