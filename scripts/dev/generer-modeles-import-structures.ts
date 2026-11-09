// Génère les modèles d'import des structures dans public/templates : npx tsx scripts/dev/generer-modeles-import-structures.ts
import ExcelJS from "exceljs";
import { estSiretValide } from "@/features/backoffice/administration/experts/domain/regles-experts";

const siretValide = (base: string) => {
  for (let cle = 0; cle < 10; cle++) if (estSiretValide(`${base}${cle}`)) return `${base}${cle}`;
  throw new Error("aucune clé");
};

type Colonne = [cle: string, obligatoire: string, contenu: string];

const IDENTITE: Colonne[] = [
  ["nom", "Oui", "Nom de la structure. Peut être omis sur une ligne qui complète la précédente (même SIRET)."],
  ["siret", "Oui", "14 chiffres. Désigne la structure : une structure existante de ce SIRET est mise à jour."],
  ["adresse", "Non", "Adresse de la structure, montrée aux demandeurs."],
  ["telephone", "Non", "Téléphone de la structure."],
  ["horaires", "Non", "Horaires d'ouverture, en une ou deux lignes."],
];

const REGLES = [
  "Une ligne par structure, rapprochée par son SIRET. Rien n'est supprimé.",
  "Nom, adresse, téléphone et horaires d'une structure existante ne sont que complétés, sauf si la case « Remplacer les coordonnées » est cochée.",
  "Le territoire et les emails du fichier remplacent ceux de l'habilitation.",
];

const MODELES: { fichier: string; colonnes: Colonne[]; regles: string[]; lignes: Record<string, string>[] }[] = [
  {
    fichier: "amo-exemple.xlsx",
    colonnes: [
      ...IDENTITE,
      ["departements", "Oui", "Départements couverts, par exemple « Indre 36, Cher 18 »."],
      ["emails", "Oui", "Équipe qui reçoit les demandes d'accompagnement, séparée par , ou ;."],
      ["epci", "Non", "Codes EPCI (9 chiffres) couverts, séparés par , ou ;."],
      ["communes", "Non", "Codes INSEE des communes couvertes, séparés par , ou ;."],
    ],
    regles: [...REGLES, "Ajouter l'AMO à une structure qui a des agents leur donne ce rôle : réservé au super-administrateur."],
    lignes: [
      {
        nom: "Structure exemple AMO",
        siret: siretValide("9999999990001"),
        adresse: "1 rue de l'Exemple, 36000 Châteauroux",
        telephone: "02 54 00 00 00",
        horaires: "Du mardi au vendredi 8h30 - 12h / 13h - 17h30",
        departements: "Indre 36",
        emails: "amo@example.org",
        communes: "36044",
      },
    ],
  },
  {
    fichier: "allers-vers-exemple.xlsx",
    colonnes: [
      ...IDENTITE,
      ["departements", "Départements ou EPCI", "Codes des départements couverts, par exemple « 36 ; 18 »."],
      ["emails", "Oui", "Équipe de l'Aller-vers, séparée par , ou ;."],
      ["epci", "Départements ou EPCI", "Codes EPCI couverts, séparés par , ou ;."],
    ],
    regles: [
      ...REGLES,
      "Un Aller-vers déjà connu sans SIRET est retrouvé par son nom et un département commun, puis reçoit ce SIRET.",
      "Ajouter l'Aller-vers à une structure qui a des agents leur donne ce rôle : réservé au super-administrateur.",
    ],
    lignes: [
      {
        nom: "Espace conseil exemple",
        siret: siretValide("9999999990003"),
        adresse: "2 place de l'Exemple, 18000 Bourges",
        telephone: "02 48 00 00 00",
        departements: "18",
        emails: "contact@example.org",
      },
    ],
  },
  {
    fichier: "experts-exemple.xlsx",
    colonnes: [
      ...IDENTITE,
      ["departements", "Oui", "Départements d'intervention ; une ligne par contact de réservation différent."],
      ["email_reservation", "Non", "Email de réservation pour les départements de la ligne."],
      ["telephone_reservation", "Non", "Téléphone de réservation pour les départements de la ligne."],
      ["date_validation_dhup", "Non", "Date de validation par la DHUP, AAAA-MM-JJ ou JJ/MM/AAAA."],
      ["contact_interne_nom", "Non", "Contact interne, visible du seul super-administrateur."],
      ["contact_interne_email", "Non", "Email du contact interne."],
      ["contact_interne_telephone", "Non", "Téléphone du contact interne."],
    ],
    regles: [
      ...REGLES,
      "Une structure expert ne fait que de l'expertise : une société aussi AMO a une seconde structure, du même SIRET.",
      "Le fichier de la DHUP est accepté tel quel (Société, SIRET/SIREN, départements d'intervention, Contact, adresse mail, n° téléphone).",
    ],
    lignes: [
      {
        nom: "Bureau d'études exemple",
        siret: siretValide("9999999990002"),
        departements: "63",
        email_reservation: "reservation63@example.org",
        telephone_reservation: "04 73 00 00 00",
        date_validation_dhup: "2026-05-15",
        contact_interne_nom: "Camille Exemple",
        contact_interne_email: "camille@example.org",
      },
      { siret: siretValide("9999999990002"), departements: "03", email_reservation: "reservation03@example.org" },
    ],
  },
];

async function main() {
  for (const modele of MODELES) {
    const classeur = new ExcelJS.Workbook();
    const donnees = classeur.addWorksheet("Structures");
    donnees.columns = modele.colonnes.map(([cle]) => ({ header: cle, key: cle, width: Math.max(16, cle.length + 4) }));
    donnees.getRow(1).font = { bold: true };
    for (const ligne of modele.lignes) donnees.addRow(ligne);
    for (const [cle] of modele.colonnes) donnees.getColumn(cle).numFmt = "@";

    const aide = classeur.addWorksheet("Mode d'emploi");
    aide.columns = [
      { header: "Colonne", key: "colonne", width: 28 },
      { header: "Obligatoire", key: "obligatoire", width: 22 },
      { header: "Contenu", key: "contenu", width: 100 },
    ];
    aide.getRow(1).font = { bold: true };
    for (const [colonne, obligatoire, contenu] of modele.colonnes) aide.addRow({ colonne, obligatoire, contenu });
    aide.addRow({});
    for (const regle of modele.regles) aide.addRow({ colonne: regle });

    await classeur.xlsx.writeFile(`public/templates/${modele.fichier}`);
  }
}

main();
