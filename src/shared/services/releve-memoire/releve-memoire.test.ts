import { describe, expect, it } from "vitest";
import {
  classerAllocations,
  compterRessources,
  formaterAllocations,
  formaterDuree,
  formaterReleve,
  indexerParSite,
  lireMemoireConteneur,
  lireRssAnonyme,
  resumerAllocations,
  SITE_INTERNE,
  type NoeudAllocation,
  type Releve,
} from "./releve-memoire";

const MO = 1024 * 1024;

const noeud = (functionName: string, url: string, selfSize: number, children: NoeudAllocation[] = []) => ({
  callFrame: { functionName, url, lineNumber: 0, columnNumber: 99 },
  selfSize,
  children,
});

describe("lireMemoireConteneur", () => {
  it("sépare la mémoire anonyme du cache de fichiers", () => {
    const stat = `anon ${200 * MO}\nfile ${300 * MO}\nfile_mapped ${5 * MO}\nkernel ${9 * MO}\n`;

    expect(lireMemoireConteneur(stat, `${12 * MO}\n`)).toEqual({ anon: 200 * MO, cache: 300 * MO, swap: 12 * MO });
  });

  it("garde le relevé quand le swap n'est pas lisible", () => {
    expect(lireMemoireConteneur("anon 10\nfile 20\n", null)).toEqual({ anon: 10, cache: 20, swap: null });
  });

  it("renvoie null hors conteneur ou sur un format inattendu", () => {
    expect(lireMemoireConteneur(null, null)).toBeNull();
    expect(lireMemoireConteneur("rss 10\ncache 20\n", "0")).toBeNull();
  });
});

describe("lireRssAnonyme", () => {
  it("convertit les kB du noyau en octets", () => {
    expect(lireRssAnonyme("VmRSS:\t  269000 kB\nRssAnon:\t  181672 kB\nRssFile:\t   87840 kB\n")).toBe(181672 * 1024);
  });

  it("renvoie null quand le fichier manque", () => {
    expect(lireRssAnonyme(null)).toBeNull();
    expect(lireRssAnonyme("VmRSS: 12 kB\n")).toBeNull();
  });
});

describe("compterRessources", () => {
  it("ne garde que les quatre types les plus nombreux", () => {
    const types = ["Timeout", "TCPSocketWrap", "Timeout", "FSReqPromise", "TTYWrap", "PipeWrap", "TCPSocketWrap"];
    types.push("TCPSocketWrap", "ZlibStream");

    expect(compterRessources(types)).toEqual([
      ["TCPSocketWrap", 3],
      ["Timeout", 2],
      ["FSReqPromise", 1],
      ["PipeWrap", 1],
    ]);
  });
});

describe("formaterDuree", () => {
  it.each([
    [59, "0min"],
    [12 * 60, "12min"],
    [2 * 3600 + 5 * 60, "2h05"],
    [3 * 86400 + 4 * 3600 + 59, "3j04h"],
  ])("%i s donne %s", (secondes, attendu) => {
    expect(formaterDuree(secondes)).toBe(attendu);
  });
});

describe("formaterReleve", () => {
  const releve: Releve = {
    dureeSecondes: 3 * 86400 + 4 * 3600,
    conteneur: { anon: 212 * MO, cache: 180 * MO, swap: 0 },
    rss: 290 * MO,
    rssAnonyme: 182 * MO,
    tasUtilise: 128 * MO,
    tasTotal: 135 * MO,
    externe: 5 * MO,
    buffers: 1 * MO,
    espaces: { vieux: 83 * MO, grands: 35 * MO, code: 6 * MO },
    ressources: ["TCPSocketWrap", "TCPSocketWrap", "Timeout"],
  };

  it("tient en une ligne, en Mo", () => {
    expect(formaterReleve(releve)).toBe(
      "[memoire] actif=3j04h | conteneur anon=212 cache=180 swap=0 | " +
        "processus rss=290 tas=128/135 horsTas=47 externe=5 buffers=1 | " +
        "tas vieux=83 grands=35 code=6 | ressources TCPSocketWrap=2 Timeout=1"
    );
  });

  it("omet ce que la machine ne sait pas mesurer", () => {
    const ligne = formaterReleve({ ...releve, conteneur: null, rssAnonyme: null, ressources: [] });

    expect(ligne).toBe(
      "[memoire] actif=3j04h | processus rss=290 tas=128/135 externe=5 buffers=1 | tas vieux=83 grands=35 code=6"
    );
  });
});

describe("resumerAllocations", () => {
  const racine = noeud("(root)", "", 0, [
    noeud("handler", "file:///app/.next/server/app/api/x/route.js", 0, [
      noeud("findByEpci", "file:///app/.next/server/chunks/4436.js", 2 * MO, [
        // Cadre natif : la mémoire revient à la fonction applicative qui l'a appelé.
        noeud("parse", "", 6 * MO),
        noeud("readFileSync", "node:fs", 1 * MO),
      ]),
    ]),
    noeud("render", "file:///app/node_modules/.pnpm/next@15/node_modules/next/dist/server/render.js", 3 * MO),
    noeud("(garbage collector)", "", 1 * MO),
  ]);

  it("attribue chaque objet vivant à la fonction applicative la plus proche", () => {
    const resume = resumerAllocations(racine, "/app");

    expect(resume.total).toBe(13 * MO);
    expect(resume.sites).toEqual([
      { site: "findByEpci (chunks/4436.js:1:100)", octets: 9 * MO, appelants: ["handler (app/api/x/route.js:1:100)"] },
      { site: "render (nm/next/dist/server/render.js:1:100)", octets: 3 * MO, appelants: [] },
      { site: SITE_INTERNE, octets: 1 * MO, appelants: [] },
    ]);
  });
});

describe("classerAllocations", () => {
  const sites = [
    { site: "manifestes", octets: 30 * MO, appelants: [] },
    { site: "cache", octets: 12 * MO, appelants: ["rendu"] },
    { site: "nouveau", octets: 4 * MO, appelants: [] },
  ];

  it("classe par taille tant qu'aucune référence n'existe", () => {
    const classes = classerAllocations(sites, null, 2);

    expect(classes.map((s) => [s.site, s.croissance])).toEqual([
      ["manifestes", null],
      ["cache", null],
    ]);
  });

  it("classe par croissance depuis la référence, site inconnu compris", () => {
    const reference = indexerParSite([
      { site: "manifestes", octets: 30 * MO, appelants: [] },
      { site: "cache", octets: 2 * MO, appelants: [] },
    ]);

    const classes = classerAllocations(sites, reference, 3);

    expect(classes.map((s) => [s.site, s.croissance])).toEqual([
      ["cache", 10 * MO],
      ["nouveau", 4 * MO],
      ["manifestes", 0],
    ]);
  });
});

describe("formaterAllocations", () => {
  it("écrit une ligne par site, appelants compris", () => {
    const lignes = formaterAllocations(13 * MO, [
      {
        site: "findByEpci (chunks/4436.js:1:100)",
        octets: 9.44 * MO,
        croissance: null,
        appelants: ["handler (x.js:1:1)"],
      },
      { site: SITE_INTERNE, octets: 1 * MO, croissance: null, appelants: [] },
    ]);

    expect(lignes).toEqual([
      "[memoire] allocations vivantes échantillonnées : 13.0 Mo, sites classés par taille",
      "[memoire] alloc 1/2 9.4 Mo findByEpci (chunks/4436.js:1:100) < handler (x.js:1:1)",
      "[memoire] alloc 2/2 1.0 Mo (interne Node)",
    ]);
  });

  it("affiche la croissance devant la taille quand une référence existe", () => {
    const lignes = formaterAllocations(40 * MO, [
      { site: "cache", octets: 12 * MO, croissance: 10 * MO, appelants: [] },
      { site: "manifestes", octets: 28 * MO, croissance: -2 * MO, appelants: [] },
    ]);

    expect(lignes).toEqual([
      "[memoire] allocations vivantes échantillonnées : 40.0 Mo, sites classés par croissance depuis le premier relevé",
      "[memoire] alloc 1/2 +10.0 Mo (12.0 Mo) cache",
      "[memoire] alloc 2/2 -2.0 Mo (28.0 Mo) manifestes",
    ]);
  });
});
