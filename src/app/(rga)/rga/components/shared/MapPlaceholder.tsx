interface MapPlaceholderProps {
  title: string;
  zoom: number;
}

export function MapPlaceholder({ title, zoom }: MapPlaceholderProps) {
  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <div className="fr-p-4w" style={{ backgroundColor: "#f0f0f0", minHeight: "300px" }}>
          <p>
            [Carte de {title} - Zoom: {zoom}]
          </p>
        </div>
      </div>
    </section>
  );
}
