import { describe, it, expect } from "vitest";
import { computeNeedleAngleDeg, computeNeedlePoint } from "./gauge.utils";

describe("computeNeedleAngleDeg", () => {
  it("score 0 → 180° (tout à gauche)", () => {
    expect(computeNeedleAngleDeg(0)).toBe(180);
  });

  it("score 50 → 90° (vertical)", () => {
    expect(computeNeedleAngleDeg(50)).toBe(90);
  });

  it("score 100 → 0° (tout à droite)", () => {
    expect(computeNeedleAngleDeg(100)).toBe(0);
  });

  it("clampe les valeurs hors [0,100]", () => {
    expect(computeNeedleAngleDeg(-20)).toBe(180);
    expect(computeNeedleAngleDeg(150)).toBe(0);
  });
});

describe("computeNeedlePoint", () => {
  it("score 0 pointe vers la gauche du centre", () => {
    const point = computeNeedlePoint(0, 100, 100, 50);
    expect(point.x).toBeCloseTo(50, 5);
    expect(point.y).toBeCloseTo(100, 5);
  });

  it("score 100 pointe vers la droite du centre", () => {
    const point = computeNeedlePoint(100, 100, 100, 50);
    expect(point.x).toBeCloseTo(150, 5);
    expect(point.y).toBeCloseTo(100, 5);
  });

  it("score 50 pointe vers le haut du centre", () => {
    const point = computeNeedlePoint(50, 100, 100, 50);
    expect(point.x).toBeCloseTo(100, 5);
    expect(point.y).toBeCloseTo(50, 5);
  });
});
