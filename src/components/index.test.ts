import * as Components from "./index";

describe("Components exports", () => {
  it("exports all components correctly", () => {
    const expectedExports = [
      "Badge",
      "BadgeVariant",
      "BadgeSize",
      "BlockNumber",
      "Breadcrumb",
      "BlockNumberSize",
      "Card",
      "CardImage",
      "CheckboxGroup",
      "Footer",
      "Header",
      "IconBackground",
      "IconBackgroundVariant",
      "Link",
      "LinkSize",
      "LinkVariant",
      "Matomo",
      "Notice",
      "SVGLoader",
      "Tile",
      "Tooltip",
    ];

    expectedExports.forEach((exportName) => {
      expect(Components).toHaveProperty(exportName);
    });

    const actualExports = Object.keys(Components);
    expect(actualExports.sort()).toEqual(expectedExports.sort());
  });

  it("exports components as non-null values", () => {
    const componentNames = [
      "Badge",
      "BlockNumber",
      "Card",
      "CardImage",
      "CheckboxGroup",
      "Footer",
      "Header",
      "IconBackground",
      "Link",
      "Matomo",
      "Notice",
      "SVGLoader",
      "Tile",
      "Tooltip",
    ];

    componentNames.forEach((componentName) => {
      expect(
        Components[componentName as keyof typeof Components]
      ).toBeDefined();
      expect(
        Components[componentName as keyof typeof Components]
      ).not.toBeNull();
    });
  });

  it("exports enums with correct values", () => {
    expect(Components.BadgeVariant).toBeDefined();
    expect(Components.BadgeSize).toBeDefined();
    expect(Components.BlockNumberSize).toBeDefined();
    expect(Components.IconBackgroundVariant).toBeDefined();
    expect(Components.LinkSize).toBeDefined();
    expect(Components.LinkVariant).toBeDefined();
  });
});
