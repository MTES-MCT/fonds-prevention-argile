import { describe, it, expect, vi } from "vitest";

import { testerWebgl2 } from "./webgl";

function canvasAvec(getContext: (type: string) => unknown): HTMLCanvasElement {
  return { getContext } as unknown as HTMLCanvasElement;
}

describe("testerWebgl2", () => {
  it("est disponible quand le navigateur rend un contexte webgl2", () => {
    expect(testerWebgl2(canvasAvec(() => ({ getExtension: () => null })))).toBe(true);
  });

  it("rend le contexte de test au navigateur pour ne pas consommer son quota", () => {
    const loseContext = vi.fn();
    expect(testerWebgl2(canvasAvec(() => ({ getExtension: () => ({ loseContext }) })))).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("est indisponible quand getContext rend null (GPU sur liste noire, accélération coupée)", () => {
    expect(testerWebgl2(canvasAvec(() => null))).toBe(false);
  });

  it("est indisponible quand getContext lève (WebGL désactivé par configuration)", () => {
    expect(
      testerWebgl2(
        canvasAvec(() => {
          throw new Error("WebGL is disabled");
        })
      )
    ).toBe(false);
  });
});
