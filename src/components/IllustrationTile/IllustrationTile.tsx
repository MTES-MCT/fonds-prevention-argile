import Image from "next/image";

const IllustrationTile = ({
  imageSrc = "/illustrations/technical-error.svg",
  imageAlt = "Erreur technique",
  imageHeight = 150,
  imageWidth = 150,
  title = "Titre de la tuile",
  description = "Description de la tuile avec plus de détails sur le contenu.",
}) => {
  return (
    <div className="bg-white shadow-md p-6 max-w-sm flex items-center gap-4">
      {/* Image */}
      <div className="flex-shrink-0 w-1/4">
        <Image
          alt={imageAlt}
          height={imageHeight}
          src={imageSrc}
          width={imageWidth}
        />
      </div>

      {/* Zone texte  */}
      <div className="flex-1">
        {/* Titre */}
        <h6 className="leading-tight font-semibold text-gray-900 mb-2">
          {title}
        </h6>

        {/* Description */}
        <div className="text-sm leading-tight text-gray-600">{description}</div>
      </div>
    </div>
  );
};

export default IllustrationTile;
