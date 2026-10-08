import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionStep, type QuestionOption } from "./QuestionStep";
import { getCritereConfig } from "../../domain/value-objects/grille-categorisation";

const LABELS = ["Point critique", "Point de vigilance", "À surveiller", "Bonne pratique en place"];

function rendre(critereId: string, selected: string | undefined) {
  const options: QuestionOption<string>[] = (getCritereConfig(critereId)?.reponses ?? []).map((r) => ({
    value: r.reponse,
    label: r.label,
  }));

  return render(
    <QuestionStep<string>
      fieldsetName={critereId}
      critereId={critereId}
      title="Question"
      illustration={null}
      description="Description"
      options={options}
      selected={selected}
      onSelect={() => {}}
      numeroEtape={1}
      totalEtapes={13}
      canGoBack={false}
      onNext={() => {}}
      onBack={() => {}}
    />
  );
}

function labelsAffiches(): string[] {
  return LABELS.filter((label) => screen.queryByText(label) !== null);
}

describe("QuestionStep — label de catégorie", () => {
  it.each([
    ["reseaux_enterres", "sous_fondations", "Point critique"],
    ["reseaux_enterres", "proches", "Point de vigilance"],
    ["reseaux_enterres", "ne_sais_pas", "À surveiller"],
    ["reseaux_enterres", "eloignes", "Bonne pratique en place"],
  ])("%s / %s affiche « %s »", (critereId, reponse, label) => {
    rendre(critereId, reponse);

    expect(labelsAffiches()).toEqual([label]);
  });

  it("explique un point à surveiller sous la réponse sélectionnée, et lui seul", () => {
    const { unmount } = rendre("recuperateur_eau", "present_bon_etat");
    expect(screen.getByText(/peut en faire un point critique/)).toBeInTheDocument();
    unmount();

    rendre("recuperateur_eau", "present_fuite_ou_mal_raccorde");
    expect(screen.queryByText(/peut en faire un point critique/)).toBeNull();
  });

  it("n'affiche le label que sur la réponse sélectionnée", () => {
    rendre("reseaux_enterres", undefined);

    expect(labelsAffiches()).toEqual([]);
  });

  it("n'affiche aucun label sur une réponse sans objet", () => {
    rendre("source_chaleur_sous_sol", "pas_de_sous_sol");

    expect(labelsAffiches()).toEqual([]);
  });

  it("n'affiche aucun label sur « arbre proche = oui » : l'essence porte le point", () => {
    rendre("arbre_proximite", "oui");

    expect(labelsAffiches()).toEqual([]);
  });
});
