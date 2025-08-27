const InfoTile = ({
  icon = "fr-icon-information-fill",
  iconColor = "text-blue-600",
  title = "Titre de la tuile",
  description = "Description de la tuile avec plus de détails sur le contenu.",
}) => {
  return (
    <div className="bg-white shadow-md p-6 max-w-sm">
      {/* Icône */}
      <div className={`${icon} fr-icon--sm mb-2 ${iconColor}`}></div>

      {/* Titre */}
      <h6 className="leading-tight">{title}</h6>

      {/* Description */}
      <div className="text-sm leading-tight">{description}</div>
    </div>
  );
};

export default InfoTile;
