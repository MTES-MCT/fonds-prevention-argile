import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

interface InfoDossierCalloutProps {
  currentStep: Step;
  currentStatus: Status;
  dsStatus: DSStatus | null;
}

interface CalloutMessage {
  title: string;
  description: string;
  hint: string;
  variant: "yellow-moutarde" | "green-emeraude" | "blue-france" | "red-marianne";
}

/**
 * Messages lorsque le dossier est accepte pour l'etape courante
 */
function getAccepteMessage(currentStep: Step): CalloutMessage {
  switch (currentStep) {
    case Step.ELIGIBILITE:
      return {
        title: "L'éligibilité a été acceptée par la DDT.",
        description:
          "Le demandeur peut maintenant passer à l'étape suivante : le diagnostic de son logement.",
        hint: "Accompagnez le demandeur dans la recherche d'un expert pour réaliser le diagnostic.",
        variant: "green-emeraude",
      };
    case Step.DIAGNOSTIC:
      return {
        title: "Le diagnostic a été accepté par la DDT.",
        description:
          "Le demandeur peut maintenant passer à l'étape suivante : la soumission des devis pour accord avant travaux.",
        hint: "Accompagnez le demandeur dans la recherche d'entreprises pour réaliser les travaux.",
        variant: "green-emeraude",
      };
    case Step.DEVIS:
      return {
        title: "Les devis ont été acceptés par la DDT.",
        description:
          "Le demandeur peut maintenant réaliser les travaux. Une fois terminés, il devra transmettre les factures.",
        hint: "Assurez-vous que les travaux sont réalisés conformément aux devis validés.",
        variant: "green-emeraude",
      };
    case Step.FACTURES:
      return {
        title: "Les factures ont été acceptées par la DDT.",
        description:
          "Le paiement et la clôture de la demande sont à venir.",
        hint: "",
        variant: "green-emeraude",
      };
    default:
      return {
        title: "Dossier accepté.",
        description: "Le dossier a été accepté par les services compétents.",
        hint: "",
        variant: "green-emeraude",
      };
  }
}

/**
 * Messages lorsque le dossier est refuse
 */
function getRefuseMessage(currentStep: Step): CalloutMessage {
  const lienDS = "demarche.numerique.gouv.fr";
  const stepLabel: Record<string, string> = {
    [Step.ELIGIBILITE]: "La demande d'éligibilité",
    [Step.DIAGNOSTIC]: "Le diagnostic",
    [Step.DEVIS]: "Les devis",
    [Step.FACTURES]: "Les factures",
  };
  const label = stepLabel[currentStep] ?? "Le dossier";

  return {
    title: `${label} a été refusé(e) par la DDT.`,
    description: `Pour en savoir plus, le demandeur doit consulter sa messagerie sur ${lienDS}.`,
    hint: "",
    variant: "red-marianne",
  };
}

/**
 * Messages lorsque le dossier est en instruction
 */
function getEnInstructionMessage(currentStep: Step): CalloutMessage {
  const stepLabel: Record<string, string> = {
    [Step.ELIGIBILITE]: "La demande d'éligibilité est",
    [Step.DIAGNOSTIC]: "Le diagnostic est",
    [Step.DEVIS]: "Les devis sont",
    [Step.FACTURES]: "Les factures sont",
  };
  const label = stepLabel[currentStep] ?? "Le dossier est";

  return {
    title: `${label} en cours d'instruction par la DDT.`,
    description: "Le demandeur sera notifié une fois la décision prise.",
    hint: "",
    variant: "blue-france",
  };
}

/**
 * Messages par defaut (TODO / en construction)
 */
function getDefaultMessage(currentStep: Step): CalloutMessage {
  switch (currentStep) {
    case Step.ELIGIBILITE:
      return {
        title:
          'Le demandeur doit transmettre sa demande d\'éligibilité à la DDT via <a href="https://demarche.numerique.gouv.fr" target="_blank" rel="noopener noreferrer">demarche.numerique.gouv.fr</a>.',
        description:
          "Son lien pour remplir le formulaire est disponible sur son compte, il peut vous inviter depuis son dossier démarche numérique pour l'aider à le remplir.",
        hint: "N'hésitez pas à relancer le demandeur si son dossier n'est pas déposé.",
        variant: "yellow-moutarde",
      };
    case Step.DIAGNOSTIC:
      return {
        title: "Le demandeur doit transmettre le diagnostic réalisé via demarche.numerique.gouv.fr.",
        description:
          "Le diagnostic doit être réalisé par un expert agréé. Le demandeur peut soumettre le rapport depuis son espace personnel.",
        hint: "Assurez-vous que le diagnostic est complet avant la soumission.",
        variant: "yellow-moutarde",
      };
    case Step.DEVIS:
      return {
        title: "Le demandeur doit transmettre les devis des travaux via demarche.numerique.gouv.fr.",
        description:
          "Les devis doivent correspondre aux travaux préconisés dans le diagnostic. Le demandeur peut les soumettre depuis son espace personnel.",
        hint: "Vérifiez que les devis sont conformes aux préconisations du diagnostic.",
        variant: "yellow-moutarde",
      };
    case Step.FACTURES:
      return {
        title: "Le demandeur doit transmettre les factures après travaux via demarche.numerique.gouv.fr.",
        description:
          "Une fois les travaux terminés, le demandeur peut soumettre les factures pour recevoir les aides.",
        hint: "Les factures doivent correspondre aux devis validés.",
        variant: "yellow-moutarde",
      };
    default:
      return {
        title: "Dossier en cours de traitement.",
        description: "Le dossier est en cours de traitement par les services compétents.",
        hint: "",
        variant: "yellow-moutarde",
      };
  }
}

/**
 * Callout informatif sur l'etat du dossier et les actions a effectuer par le demandeur
 */
export function InfoDossierCallout({ currentStep, currentStatus, dsStatus }: InfoDossierCalloutProps) {
  let message: CalloutMessage;

  if (dsStatus === DSStatus.ACCEPTE || currentStatus === Status.VALIDE) {
    message = getAccepteMessage(currentStep);
  } else if (dsStatus === DSStatus.REFUSE || dsStatus === DSStatus.CLASSE_SANS_SUITE) {
    message = getRefuseMessage(currentStep);
  } else if (dsStatus === DSStatus.EN_INSTRUCTION || currentStatus === Status.EN_INSTRUCTION) {
    message = getEnInstructionMessage(currentStep);
  } else {
    message = getDefaultMessage(currentStep);
  }

  return (
    <div className={`fr-callout fr-callout--${message.variant}`}>
      <h3 className="fr-callout__title" dangerouslySetInnerHTML={{ __html: message.title }}></h3>
      <p className="fr-callout__text" dangerouslySetInnerHTML={{ __html: message.description }}></p>
      {message.hint && <p className="fr-text--sm fr-text-mention--grey fr-mt-2w fr-mb-0">{message.hint}</p>}
    </div>
  );
}
