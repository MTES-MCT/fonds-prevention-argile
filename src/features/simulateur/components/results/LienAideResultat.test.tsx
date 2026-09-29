import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultEligible } from "./ResultEligible";
import { SimulateurProvider } from "../shared/SimulateurContext";
import type { EligibilityChecks } from "../../domain/entities/eligibility-result.entity";

const checks = { maison: true } as EligibilityChecks;
const props = { checks, onContinue: vi.fn(), onRestart: vi.fn(), onBack: vi.fn() };

describe("LienAideResultat", () => {
  it("n'est pas répété sur le résultat quand le header du tunnel le porte", () => {
    render(<ResultEligible {...props} />);

    expect(screen.queryByRole("link", { name: "Besoin d'aide ?" })).not.toBeInTheDocument();
  });

  it("reste affiché dans l'iframe, qui n'a pas de header", () => {
    render(
      <SimulateurProvider showHelpLink>
        <ResultEligible {...props} />
      </SimulateurProvider>
    );

    expect(screen.getByRole("link", { name: "Besoin d'aide ?" })).toBeInTheDocument();
  });
});
