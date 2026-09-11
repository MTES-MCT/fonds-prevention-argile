import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ARGILE_PMTILES_URL } from "./rga-map.config";

describe("ARGILE_PMTILES_URL", () => {
  it("reste synchronisée avec la source 'argile' de style-carte-argile.json", () => {
    const stylePath = join(process.cwd(), "public/map/style-carte-argile.json");
    const style = JSON.parse(readFileSync(stylePath, "utf-8"));
    const argileUrl: string = style.sources.argile.url;

    expect(argileUrl).toBe(`pmtiles://${ARGILE_PMTILES_URL}`);
  });
});
