export default function CalloutRemplirFormulaire() {
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">A FAIRE</p>
      <p className="fr-callout__text">
        Il est essentiel de compléter et de soumettre le premier formulaire pour
        que votre dossier soit examiné par les autorités compétentes. Par la
        suite, vous recevrez une notification concernant les étapes à suivre.
      </p>
      <button type="button" className="fr-btn">
        Remplir le formulaire d'éligibilité
      </button>
    </div>
  );
}
