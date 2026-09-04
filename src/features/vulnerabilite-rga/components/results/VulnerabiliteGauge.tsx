import { computeNeedlePoint } from "./gauge.utils";
import { getNiveauVulnerabilite, type NiveauVulnerabilite } from "../../domain/services/scoring.service";

interface VulnerabiliteGaugeProps {
  /** Score de vulnérabilité, 0 (faible) à 100 (très élevé). */
  score: number;
  size?: number;
}

const CX = 100;
const CY = 100;
const RADIUS = 90;
const STROKE_WIDTH = 18;
const NEEDLE_LENGTH = 75;

/** 5 bandes de couleur, vert (idéal) → rouge (risque maximal), chacune sur 36°. */
const BANDES_COULEUR = ["#18753C", "#8ABF3F", "#E9C53B", "#E4794A", "#CE0500"];

const NIVEAU_LABELS: Record<NiveauVulnerabilite, string> = {
  faible: "Faible",
  modere: "Modérée",
  eleve: "Élevée",
  tres_eleve: "Très élevée",
};

/** Point sur l'arc à l'angle donné (0° = droite, 180° = gauche). */
function pointOnArc(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

function arcPath(startAngle: number, endAngle: number): string {
  const start = pointOnArc(startAngle, RADIUS);
  const end = pointOnArc(endAngle, RADIUS);
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 0 ${end.x} ${end.y}`;
}

/**
 * Jauge de vulnérabilité en demi-cercle (vert à gauche, rouge à droite) avec aiguille.
 * SVG custom plutôt que `@gouvfr/dsfr-chart` GaugeChart : ce composant n'est câblé nulle
 * part dans `useDsfrChart.ts` (seul LineChart l'est), jamais utilisé ni testé dans ce
 * repo — un SVG maison donne un contrôle total sur les couleurs et l'accessibilité.
 */
export function VulnerabiliteGauge({ score, size = 280 }: VulnerabiliteGaugeProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const niveau = getNiveauVulnerabilite(clamped);
  const needleTip = computeNeedlePoint(clamped, CX, CY, NEEDLE_LENGTH);

  return (
    <div role="img" aria-label={`Vulnérabilité estimée : ${clamped} sur 100, niveau ${NIVEAU_LABELS[niveau]}`}>
      <svg viewBox="0 0 200 115" width={size} aria-hidden="true">
        {BANDES_COULEUR.map((couleur, index) => (
          <path
            key={couleur}
            d={arcPath(180 - index * 36, 180 - (index + 1) * 36)}
            fill="none"
            stroke={couleur}
            strokeWidth={STROKE_WIDTH}
          />
        ))}
        <line
          x1={CX}
          y1={CY}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="#161616"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={6} fill="#161616" />
      </svg>
      <p className="fr-text--bold fr-mb-0" style={{ textAlign: "center", fontSize: "1.5rem" }}>
        {clamped}/100
      </p>
      <p className="fr-mb-0" style={{ textAlign: "center" }}>
        Vulnérabilité {NIVEAU_LABELS[niveau].toLowerCase()}
      </p>
    </div>
  );
}
