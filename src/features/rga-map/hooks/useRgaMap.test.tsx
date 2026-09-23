import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { useRgaMap } from "./useRgaMap";
import { webgl2EstDisponible } from "../domain/webgl";

vi.mock("../domain/webgl", () => ({ webgl2EstDisponible: vi.fn(() => true) }));

const remove = vi.fn();
const constructeurMap = vi.fn();

vi.mock("maplibre-gl", () => {
  class FakeMap {
    constructor(options: unknown) {
      constructeurMap(options);
    }
    addControl = vi.fn();
    on = vi.fn();
    remove = () => remove();
  }
  return {
    Map: FakeMap,
    NavigationControl: class {},
    setWorkerUrl: vi.fn(),
    addProtocol: vi.fn(),
    removeProtocol: vi.fn(),
  };
});

vi.mock("pmtiles", () => ({
  Protocol: class {
    tile = vi.fn();
    add = vi.fn();
  },
  PMTiles: class {
    getHeader = () => Promise.resolve({});
  },
}));

function Carte() {
  const { mapRef, webglIndisponible } = useRgaMap({ center: { lat: 44.11, lon: 6.0 } });
  return <div ref={mapRef} data-testid="carte" data-indisponible={String(webglIndisponible)} />;
}

function indisponible(): string | null {
  return screen.getByTestId("carte").getAttribute("data-indisponible");
}

describe("useRgaMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webgl2EstDisponible).mockReturnValue(true);
    remove.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("n'instancie aucune carte quand WebGL2 manque, et le signale à l'appelant", () => {
    vi.mocked(webgl2EstDisponible).mockReturnValue(false);

    render(<Carte />);

    expect(constructeurMap).not.toHaveBeenCalled();
    expect(indisponible()).toBe("true");
  });

  it("instancie la carte quand WebGL2 est disponible", () => {
    render(<Carte />);

    expect(constructeurMap).toHaveBeenCalledOnce();
    expect(indisponible()).toBe("false");
  });

  // Régression maplibre 6 : sans WebGL2 son `remove()` lève (`painter` indéfini), et l'erreur
  // partant d'un cleanup d'effet remontait jusqu'à la frontière d'erreur racine - page blanche
  // « Application error » sur tout le simulateur, au moindre changement d'adresse.
  it("ne propage pas l'échec de destruction de la carte au démontage", () => {
    remove.mockImplementation(() => {
      throw new TypeError("Cannot read properties of undefined (reading 'destroy')");
    });
    const erreurConsole = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(<Carte />);

    expect(() => unmount()).not.toThrow();
    expect(erreurConsole).toHaveBeenCalled();
  });
});
