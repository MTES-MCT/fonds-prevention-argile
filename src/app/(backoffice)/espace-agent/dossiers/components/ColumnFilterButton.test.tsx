import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColumnFilterButton } from "./ColumnFilterButton";

const OPTIONS = [
  { value: "A", label: "Alpha" },
  { value: "B", label: "Bravo" },
  { value: "C", label: "Charlie" },
];

describe("ColumnFilterButton", () => {
  it("ouvre le popover au clic sur le bouton", () => {
    render(<ColumnFilterButton ariaLabel="Filtrer" options={OPTIONS} selected={new Set()} onChange={() => {}} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filtrer" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("notifie une nouvelle sélection au cochage (live)", () => {
    const onChange = vi.fn();
    render(<ColumnFilterButton ariaLabel="Filtrer" options={OPTIONS} selected={new Set()} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Filtrer" }));
    fireEvent.click(screen.getByLabelText("Bravo"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Set<string>;
    expect([...arg]).toEqual(["B"]);
  });

  it("dé-coche une valeur déjà sélectionnée", () => {
    const onChange = vi.fn();
    render(
      <ColumnFilterButton ariaLabel="Filtrer" options={OPTIONS} selected={new Set(["A"])} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Filtrer" }));
    fireEvent.click(screen.getByLabelText("Alpha"));

    const arg = onChange.mock.calls[0][0] as Set<string>;
    expect(arg.size).toBe(0);
  });

  it("réinitialise la sélection au clic sur Réinitialiser", () => {
    const onChange = vi.fn();
    render(
      <ColumnFilterButton
        ariaLabel="Filtrer"
        options={OPTIONS}
        selected={new Set(["A", "B"])}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Filtrer" }));
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    const arg = onChange.mock.calls[0][0] as Set<string>;
    expect(arg.size).toBe(0);
  });
});
