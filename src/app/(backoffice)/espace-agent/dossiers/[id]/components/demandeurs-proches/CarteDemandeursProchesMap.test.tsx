import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { useRgaMap } = vi.hoisted(() => ({ useRgaMap: vi.fn() }));
vi.mock("@/features/rga-map", () => ({ useRgaMap }));
vi.mock("maplibre-gl", () => ({}));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

import { CarteDemandeursProchesMap } from "./CarteDemandeursProchesMap";

const ORIGINE = { lat: 46.81, lon: 1.69, approximative: false };

describe("CarteDemandeursProchesMap", () => {
  it("remplace la carte par un message sans WebGL 2, la liste restant à côté", () => {
    useRgaMap.mockReturnValue({ mapRef: { current: null }, map: null, isReady: false, webglIndisponible: true });

    render(<CarteDemandeursProchesMap origine={ORIGINE} voisins={[]} />);

    expect(screen.getByText(/La liste donne les mêmes dossiers/)).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("centre la carte sur le logement du dossier", () => {
    useRgaMap.mockReturnValue({ mapRef: { current: null }, map: null, isReady: false, webglIndisponible: false });

    render(<CarteDemandeursProchesMap origine={ORIGINE} voisins={[]} />);

    expect(useRgaMap).toHaveBeenCalledWith({ center: ORIGINE, zoom: 10 });
    expect(screen.getByRole("region", { name: /demandeurs proches/ })).toBeInTheDocument();
  });
});
