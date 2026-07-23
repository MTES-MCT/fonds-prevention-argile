import { describe, it, expect } from "vitest";
import { parseTestEmails } from "./fc-test-emails";

// En-tête réel du CSV FC low (docker/volumes/fcp-low/.../citizen/base.csv).
const HEADER = "login,password,family_name,preferred_username,given_name,gender,email,phone_number,birthdate";

describe("parseTestEmails", () => {
  it("extrait la colonne email, en minuscule", () => {
    const csv = [
      HEADER,
      "test,123,DUBOIS,,Angela,female,Wossewodda-3728@Yopmail.com,123456789,1962-08-24",
      "avec_nom,123,MERCIER,DUBOIS,Pierre,male,ymmyffarapp-1777@yopmail.com,623456789,1969-03-17",
    ].join("\n");

    expect(parseTestEmails(csv)).toEqual(["wossewodda-3728@yopmail.com", "ymmyffarapp-1777@yopmail.com"]);
  });

  it("dédoublonne les emails identiques", () => {
    const csv = [
      HEADER,
      "a,123,X,,A,female,dup@yopmail.com,1,2000-01-01",
      "b,123,Y,,B,male,dup@yopmail.com,2,2000-01-01",
    ].join("\n");

    expect(parseTestEmails(csv)).toEqual(["dup@yopmail.com"]);
  });

  it("ignore les lignes vides et les cellules sans '@'", () => {
    const csv = [HEADER, "a,123,X,,A,female,ok@france.fr,1,2000-01-01", "", "b,123,Y,,B,male,,2,2000-01-01", ""].join(
      "\n"
    );

    expect(parseTestEmails(csv)).toEqual(["ok@france.fr"]);
  });

  it("gère les CRLF et les guillemets autour des champs", () => {
    const csv = [
      '"login","password","family_name","preferred_username","given_name","gender","email"',
      'a,123,X,,A,female,"quote@test.fr"',
    ].join("\r\n");

    expect(parseTestEmails(csv)).toEqual(["quote@test.fr"]);
  });

  it("lève si la colonne email est absente", () => {
    expect(() => parseTestEmails("login,password,family_name\na,b,c")).toThrow(/Colonne 'email' absente/);
  });

  it("lève sur un CSV vide", () => {
    expect(() => parseTestEmails("   ")).toThrow(/CSV vide/);
  });
});
