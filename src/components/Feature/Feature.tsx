export interface FeatureProps {
  icon: string;
  title: string;
  description: string;
  iconColor?: string;
  tileColor?: string;
}

export default function Feature({
  icon,
  title,
  description,
  iconColor = "text-blue-600",
  tileColor = "bg-blue-50",
}: FeatureProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      {/* Tuile avec icône */}
      <div
        className={`${tileColor} rounded-lg w-16 h-16 flex items-center justify-center`}
      >
        <span
          className={`${icon} ${iconColor} text-2xl`}
          aria-hidden="true"
        ></span>
      </div>

      <div className="font-bold text-xl leading-tight">{title}</div>
      <div className="text-sm leading-tight">{description}</div>
    </div>
  );
}
