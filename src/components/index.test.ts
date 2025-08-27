import * as Components from "./index";
import { readdirSync, statSync } from "fs";
import { join } from "path";

describe("Components exports", () => {
  // Lire dynamiquement les dossiers de composants
  const getComponentDirectories = () => {
    const componentsPath = __dirname;
    return readdirSync(componentsPath).filter((item) => {
      const itemPath = join(componentsPath, item);
      return (
        statSync(itemPath).isDirectory() &&
        item !== "__tests__" &&
        !item.startsWith(".")
      );
    });
  };

  it("exports all component directories", () => {
    const componentDirs = getComponentDirectories();
    const actualExports = Object.keys(Components);

    componentDirs.forEach((dir) => {
      expect(actualExports).toContain(dir);
      expect(Components[dir as keyof typeof Components]).toBeDefined();
    });
  });

  it("exports components as non-null values", () => {
    const componentDirs = getComponentDirectories();

    componentDirs.forEach((componentName) => {
      expect(
        Components[componentName as keyof typeof Components]
      ).toBeDefined();
      expect(
        Components[componentName as keyof typeof Components]
      ).not.toBeNull();
    });
  });
});
