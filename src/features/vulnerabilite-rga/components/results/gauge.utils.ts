/**
 * Calculs purs pour `VulnerabiliteGauge` (jauge demi-cercle). Séparés du rendu SVG
 * pour rester testables sans DOM — même logique que le calcul d'angle d'une aiguille
 * d'horloge, appliquée à un demi-cercle : 180° = score 0 (tout à gauche, vert),
 * 0° = score 100 (tout à droite, rouge).
 */

/** Angle de l'aiguille en degrés, dans le repère mathématique standard (0° = droite, 90° = haut). */
export function computeNeedleAngleDeg(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return 180 - (clamped / 100) * 180;
}

/** Point d'extrémité de l'aiguille, à `length` du centre `(cx, cy)`. */
export function computeNeedlePoint(score: number, cx: number, cy: number, length: number): { x: number; y: number } {
  const angleRad = (computeNeedleAngleDeg(score) * Math.PI) / 180;
  return {
    x: cx + length * Math.cos(angleRad),
    y: cy - length * Math.sin(angleRad),
  };
}
