import { Step } from "@/shared/domain/value-objects/step.enum";

interface InfoDossierCalloutProps {
  currentStep: Step;
}

/**
 * Callout informatif sur l'état du dossier et les actions à effectuer par le demandeur
 */
export function InfoDossierCallout({ currentStep }: InfoDossierCalloutProps) {
  // Message par défaut pour l'étape éligibilité
  const getMessage = () => {
    switch (currentStep) {
      case Step.ELIGIBILITE:
        return {
          title:
            'Le demandeur doit transmettre sa demande d\'éligibilité à la DDT via <a href="https://demarche.numerique.gouv.fr" target="_blank" rel="noopener noreferrer">demarche.numerique.gouv.fr</a>.',
          description:
            "Son lien pour remplir le formulaire est disponible sur son compte, il peut vous inviter depuis son dossier démarche numérique pour l'aider à le remplir.",
          hint: "N'hésitez pas à relancer le demandeur si son dossier n'est pas déposé.",
        };
      case Step.DIAGNOSTIC:
        return {
          title: "Le demandeur doit transmettre le diagnostic réalisé via demarche.numerique.gouv.fr.",
          description:
            "Le diagnostic doit être réalisé par un expert agréé. Le demandeur peut soumettre le rapport depuis son espace personnel.",
          hint: "Assurez-vous que le diagnostic est complet avant la soumission.",
        };
      case Step.DEVIS:
        return {
          title: "Le demandeur doit transmettre les devis des travaux via demarche.numerique.gouv.fr.",
          description:
            "Les devis doivent correspondre aux travaux préconisés dans le diagnostic. Le demandeur peut les soumettre depuis son espace personnel.",
          hint: "Vérifiez que les devis sont conformes aux préconisations du diagnostic.",
        };
      case Step.FACTURES:
        return {
          title: "Le demandeur doit transmettre les factures après travaux via demarche.numerique.gouv.fr.",
          description:
            "Une fois les travaux terminés, le demandeur peut soumettre les factures pour recevoir les aides.",
          hint: "Les factures doivent correspondre aux devis validés.",
        };
      default:
        return {
          title: "Dossier en cours de traitement.",
          description: "Le dossier est en cours de traitement par les services compétents.",
          hint: "",
        };
    }
  };

  const message = getMessage();

  return (
    <div className="fr-callout fr-callout--yellow-moutarde">
      <h3 className="fr-callout__title" dangerouslySetInnerHTML={{ __html: message.title }}></h3>
      <p className="fr-callout__text" dangerouslySetInnerHTML={{ __html: message.description }}></p>
      {message.hint && <p className="fr-text--sm fr-text-mention--grey fr-mt-2w fr-mb-0">{message.hint}</p>}
    </div>
  );
}
