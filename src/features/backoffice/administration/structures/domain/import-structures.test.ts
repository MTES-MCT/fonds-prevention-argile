import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { join } from "node:path";
import { lireEntetes, lireStructures, type ChampImport, type LigneImport, type RoleImport } from "./import-structures";

// SIRET dont la clé de contrôle est valide, exigée pour un expert.
const SIRET_EXPERT = "39248872200027";
const SIRET_AMO = "12345678901234";

const ligne = (numero: number, valeurs: LigneImport["valeurs"]): LigneImport => ({ numero, valeurs });

describe("lireEntetes", () => {
  it("lit les colonnes du rôle importé, accents, casse et tirets bas compris", () => {
    expect(
      lireEntetes(["Nom", "SIRET", "Téléphone", "départements", "emails", "codes_insee", "inconnue"], "amo")
    ).toEqual(["nom", "siret", "telephone", "amoDepartements", "amoEmails", "amoCommunes", null]);
    expect(lireEntetes(["siret", "departements", "epci"], "allersVers")).toEqual(["siret", "avDepartements", "avEpci"]);
    expect(
      lireEntetes(
        [
          "siret",
          "departements",
          "email_reservation",
          "telephone",
          "Expert sur place téléphone",
          "forfait_diag",
          "Forfait réseaux",
        ],
        "expert"
      )
    ).toEqual([
      "siret",
      "expertDepartements",
      "expertEmail",
      "telephone",
      "expertSurPlaceTelephone",
      "expertForfaitDiagnostic",
      "expertForfaitReseau",
    ]);
  });

  it("lit le fichier de la DHUP tel quel : son téléphone et son email sont ceux de la réservation", () => {
    expect(
      lireEntetes(
        ["Société", "SIRET/SIREN", "départements d'intervention", "Contact", "adresse mail", "n° téléphone"],
        "expert"
      )
    ).toEqual(["nom", "siret", "expertDepartements", "expertContactInterneNom", "expertEmail", "expertTelephone"]);
  });

  it("refuse un fichier sans colonne SIRET", () => {
    expect(lireEntetes(["nom", "departements", "emails"], "amo")).toBeNull();
  });
});

describe("lireStructures", () => {
  it("réunit sous un SIRET les lignes d'un expert, chaque département avec son contact et son expert sur place", () => {
    const { structures, refusees } = lireStructures(
      [
        ligne(2, {
          nom: "Géotech",
          siret: SIRET_EXPERT,
          telephone: "254000000",
          expertDepartements: "36",
          expertEmail: "i@g.fr",
          expertSurPlaceNom: "Paul Martin",
          expertSurPlaceTelephone: "611223344",
          expertForfaitDiagnostic: "1 200,50",
          expertForfaitReseau: "450",
        }),
        ligne(3, { siret: SIRET_EXPERT, adresse: "1 rue", expertDepartements: "3", expertEmail: "a@g.fr" }),
      ],
      "expert"
    );

    expect(refusees).toEqual([]);
    expect(structures).toHaveLength(1);
    expect(structures[0]).toMatchObject({
      premiereLigne: 2,
      siret: SIRET_EXPERT,
      // Excel retire le zéro initial d'un téléphone ; une ligne suivante ne fait que compléter l'identité.
      identite: { nom: "Géotech", telephone: "0254000000", adresse: "1 rue" },
      amo: null,
      allersVers: null,
    });
    expect(structures[0].expert?.departements).toEqual([
      {
        code: "36",
        email: "i@g.fr",
        telephone: null,
        expertNom: "Paul Martin",
        expertEmail: null,
        expertTelephone: "0611223344",
        forfaitDiagnosticHt: 1200.5,
        forfaitReseauHt: 450,
      },
      {
        code: "03",
        email: "a@g.fr",
        telephone: null,
        expertNom: null,
        expertEmail: null,
        expertTelephone: null,
        forfaitDiagnosticHt: null,
        forfaitReseauHt: null,
      },
    ]);
  });

  it("refuse une ligne sans SIRET, sans données du rôle ou aux valeurs invalides, avec un motif lisible", () => {
    const refus = (role: RoleImport, valeurs: LigneImport["valeurs"]) =>
      lireStructures([ligne(2, valeurs)], role).refusees;

    expect(refus("allersVers", { nom: "Espace conseil", avDepartements: "18", avEmails: "a@b.fr" })).toEqual([
      { ligne: 2, motif: "SIRET manquant : il désigne la structure" },
    ]);
    expect(refus("amo", { nom: "AMO", siret: SIRET_AMO })).toEqual([
      { ligne: 2, motif: "aucune donnée d'AMO : départements et emails attendus" },
    ]);
    expect(refus("amo", { nom: "AMO", siret: SIRET_AMO, amoDepartements: "Indre 36", amoEmails: "x" })).toEqual([
      { ligne: 2, motif: "AMO : Email invalide" },
    ]);
    expect(refus("allersVers", { nom: "AV", siret: SIRET_AMO, avDepartements: "99", avEmails: "a@b.fr" })).toEqual([
      { ligne: 2, motif: "Aller-vers : département inconnu « 99 »" },
    ]);
    expect(refus("expert", { nom: "Expert", siret: "39248872200028", expertDepartements: "63" })).toEqual([
      { ligne: 2, motif: "SIRET invalide « 39248872200028 » pour un expert : la clé de contrôle ne correspond pas" },
    ]);
    expect(
      refus("expert", {
        nom: "Géotech",
        siret: SIRET_EXPERT,
        expertDepartements: "36",
        expertForfaitDiagnostic: "douze cents",
      })
    ).toEqual([{ ligne: 2, motif: "expert : Montant invalide : un nombre d'euros HT est attendu" }]);
  });

  it("refuse une AMO décrite deux fois, et un département d'expert déclaré deux fois", () => {
    const amo = { amoDepartements: "Indre 36", amoEmails: "a@b.fr" };
    expect(
      lireStructures(
        [ligne(2, { nom: "Soliha", siret: SIRET_AMO, ...amo }), ligne(3, { siret: SIRET_AMO, ...amo })],
        "amo"
      ).refusees
    ).toEqual([{ ligne: 3, motif: "AMO déjà décrite ligne 2 pour cette structure" }]);
    expect(
      lireStructures(
        [
          ligne(2, { nom: "Géotech", siret: SIRET_EXPERT, expertDepartements: "36" }),
          ligne(3, { siret: SIRET_EXPERT, expertDepartements: "36" }),
        ],
        "expert"
      ).refusees
    ).toEqual([{ ligne: 3, motif: "département 36 déjà déclaré pour cet expert" }]);
  });
});

// Les modèles téléchargeables doivent rester importables sans refus : scripts/dev/generer-modeles-import-structures.ts.
describe.each([
  ["amo", "amo-exemple.xlsx"],
  ["allersVers", "allers-vers-exemple.xlsx"],
  ["expert", "experts-exemple.xlsx"],
] as const)("modèle %s", (role, fichier) => {
  it("se lit entièrement, sans ligne refusée", async () => {
    const classeur = new ExcelJS.Workbook();
    await classeur.xlsx.readFile(join(process.cwd(), "public/templates", fichier));
    const feuille = classeur.worksheets[0];
    const entetes: string[] = [];
    feuille.getRow(1).eachCell((cellule, colonne) => {
      entetes[colonne - 1] = String(cellule.value);
    });
    const champs = lireEntetes(entetes, role);
    expect(champs).not.toBeNull();
    expect(champs).not.toContain(null);

    const lignes: LigneImport[] = [];
    feuille.eachRow((rangee, numero) => {
      if (numero === 1) return;
      const valeurs: Partial<Record<ChampImport, string>> = {};
      rangee.eachCell((cellule, colonne) => {
        valeurs[champs![colonne - 1]!] = String(cellule.value ?? "");
      });
      lignes.push({ numero, valeurs });
    });
    const { structures, refusees } = lireStructures(lignes, role);
    expect(refusees).toEqual([]);
    expect(structures.every((structure) => structure[role])).toBe(true);
  });
});
