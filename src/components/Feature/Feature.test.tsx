import { render, screen } from "@testing-library/react";

import Feature, { FeatureProps } from "./Feature";

describe("Feature Component", () => {
  const baseProps: FeatureProps = {
    icon: "fr-icon-heart-line",
    title: "Test Feature Title",
    description: "This is a test description for the feature component.",
  };

  test("renders correctly with all required props", () => {
    render(<Feature {...baseProps} />);

    expect(screen.getByText("Test Feature Title")).toBeInTheDocument();
    expect(
      screen.getByText("This is a test description for the feature component.")
    ).toBeInTheDocument();

    const iconElement = document.querySelector(".fr-icon-heart-line");
    expect(iconElement).toBeInTheDocument();
    expect(iconElement).toHaveClass("fr-icon-heart-line");
    expect(iconElement).toHaveClass("text-blue-600"); // Couleur par défaut
  });

  test("renders with custom colors", () => {
    render(
      <Feature
        {...baseProps}
        iconColor="text-green-600"
        tileColor="bg-green-50"
      />
    );

    const iconElement = document.querySelector(".fr-icon-heart-line");
    expect(iconElement).toHaveClass("text-green-600");

    const tileElement = iconElement?.closest("div");
    expect(tileElement).toHaveClass("bg-green-50");
  });

  test("applies default colors when not specified", () => {
    render(<Feature {...baseProps} />);

    const iconElement = document.querySelector(".fr-icon-heart-line");
    expect(iconElement).toHaveClass("text-blue-600");

    const tileElement = iconElement?.closest("div");
    expect(tileElement).toHaveClass("bg-blue-50");
  });

  test("handles different icon classes", () => {
    render(<Feature {...baseProps} icon="fr-icon-tools-fill" />);

    const iconElement = document.querySelector(".fr-icon-tools-fill");
    expect(iconElement).toHaveClass("fr-icon-tools-fill");
    expect(iconElement).not.toHaveClass("fr-icon-heart-line");
  });

  test("handles empty description", () => {
    render(<Feature {...baseProps} description="" />);

    expect(screen.getByText("Test Feature Title")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "This is a test description for the feature component."
      )
    ).not.toBeInTheDocument();
  });

  test("applies correct CSS classes for layout", () => {
    const { container } = render(<Feature {...baseProps} />);

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass(
      "flex",
      "flex-col",
      "items-start",
      "gap-4"
    );

    const tileContainer = mainContainer.querySelector("div > div");
    expect(tileContainer).toHaveClass(
      "rounded-lg",
      "w-16",
      "h-16",
      "flex",
      "items-center",
      "justify-center"
    );
  });

  test("icon has correct accessibility attributes", () => {
    render(<Feature {...baseProps} />);

    const iconElement = document.querySelector(".fr-icon-heart-line");
    expect(iconElement).toHaveAttribute("aria-hidden", "true");
  });
});
