import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DepartementsSelect from "./DepartementsSelect";

const ouvrir = () => userEvent.click(screen.getByPlaceholderText("Rechercher..."));

describe("DepartementsSelect", () => {
  it("ne propose que les 11 départements du dispositif", async () => {
    render(<DepartementsSelect value={["36"]} onChange={vi.fn()} />);
    await ouvrir();

    const codes = screen.getAllByRole("checkbox").map((case_) => case_.closest("button")?.textContent?.slice(0, 2));
    expect(codes).toEqual(["03", "04", "24", "32", "36", "47", "54", "59", "63", "81", "82"]);
  });

  it("reconnaît un suivi enregistré « 3 » comme l'Allier, et le retire", async () => {
    const onChange = vi.fn();
    render(<DepartementsSelect value={["3", "36"]} onChange={onChange} />);
    await ouvrir();

    const allier = screen.getByRole("button", { name: /^03\s*Allier/ });
    expect(allier.querySelector("input")).toBeChecked();
    await userEvent.click(allier);
    expect(onChange).toHaveBeenCalledWith(["36"]);
  });
});
