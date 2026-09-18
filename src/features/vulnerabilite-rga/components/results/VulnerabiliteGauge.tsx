import { computeNeedlePoint } from "./gauge.utils";
import { getNiveauVulnerabilite } from "../../domain/services/scoring.service";
import { NIVEAU_LABELS } from "../../domain/value-objects/niveau-badge.const";

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

/** Point sur l'arc à l'angle donné (0° = droite, 180° = gauche). */
function pointOnArc(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

// sweep-flag=1 : avec des points calculés directement sur le cercle (CX, CY, RADIUS), c'est
// le seul flag qui fait résoudre à ce centre par le moteur SVG (vérifié via la formule de
// conversion endpoint -> centre, spec F.6.5) — sweep-flag=0 fait bulger chaque bande vers un
// centre complètement différent, cassant la continuité de l'arc.
function arcPath(startAngle: number, endAngle: number): string {
  const start = pointOnArc(startAngle, RADIUS);
  const end = pointOnArc(endAngle, RADIUS);
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;
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
        <defs>
          {/* markerUnits="userSpaceOnUse" : sinon la taille est multipliée par strokeWidth (3), donnant une flèche énorme. */}
          <marker
            id="gauge-needle-arrow"
            markerWidth="12"
            markerHeight="12"
            refX="12"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse">
            <path d="M0,0 L12,6 L0,12 Z" fill="#161616" />
          </marker>
        </defs>
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
          markerEnd="url(#gauge-needle-arrow)"
        />
        <circle cx={CX} cy={CY} r={4} fill="#161616" />
      </svg>
      <p className="fr-text--bold fr-mb-1v" style={{ textAlign: "center", fontSize: "1.5rem" }}>
        {clamped}/100
      </p>
      <p className="fr-mb-0" style={{ textAlign: "center" }}>
        Vulnérabilité {NIVEAU_LABELS[niveau].toLowerCase()}
      </p>
    </div>
  );
}
