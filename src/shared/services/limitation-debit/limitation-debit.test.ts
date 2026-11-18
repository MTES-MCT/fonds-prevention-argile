import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEBITS,
  NOMBRE_MAX_COMPTEURS,
  adresseClient,
  limiterDebit,
  nombreDeCompteurs,
  reinitialiserDebits,
} from "./limitation-debit";

const requete = (enTetes: Record<string, string> = {}) => new Request("https://fonds.test/api", { headers: enTetes });
const depuis = (ip: string) => requete({ "x-real-ip": ip });

function appeler(fois: number, ip: string, nom: keyof typeof DEBITS = "lecture") {
  let derniere = null;
  for (let i = 0; i < fois; i++) derniere = limiterDebit(depuis(ip), nom);
  return derniere;
}

describe("limiterDebit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reinitialiserDebits();
  });
  afterEach(() => vi.useRealTimers());

  it("laisse passer jusqu'au plafond, puis répond 429 avec le délai d'attente", async () => {
    expect(appeler(DEBITS.lecture.max, "203.0.113.1")).toBeNull();

    const refus = limiterDebit(depuis("203.0.113.1"), "lecture");

    expect(refus?.status).toBe(429);
    expect(refus?.headers.get("retry-after")).toBe("60");
    expect(await refus?.json()).toEqual({ error: "Trop de requêtes. Réessayez dans une minute." });
  });

  it("rouvre l'accès une fois la fenêtre écoulée", () => {
    appeler(DEBITS.lecture.max + 1, "203.0.113.1");
    vi.advanceTimersByTime(DEBITS.lecture.fenetreMs - 1);
    expect(limiterDebit(depuis("203.0.113.1"), "lecture")?.status).toBe(429);

    vi.advanceTimersByTime(1);
    expect(limiterDebit(depuis("203.0.113.1"), "lecture")).toBeNull();
  });

  it("compte chaque adresse à part : un visiteur bloqué n'en bloque pas un autre", () => {
    appeler(DEBITS.lecture.max + 1, "203.0.113.1");

    expect(limiterDebit(depuis("203.0.113.2"), "lecture")).toBeNull();
  });

  it("compte chaque règle à part : épuiser les lectures ne bloque pas la connexion", () => {
    appeler(DEBITS.lecture.max + 1, "203.0.113.1", "lecture");

    expect(limiterDebit(depuis("203.0.113.1"), "connexion")).toBeNull();
  });

  // Chaque adresse nouvelle crée une entrée : sans borne, un balayage d'adresses remplirait la mémoire.
  it("ne garde jamais plus de compteurs que la borne", () => {
    for (let i = 0; i < NOMBRE_MAX_COMPTEURS + 500; i++) limiterDebit(depuis(`adresse-${i}`), "lecture");

    expect(nombreDeCompteurs()).toBeLessThanOrEqual(NOMBRE_MAX_COMPTEURS);
  });
});

describe("adresseClient", () => {
  it("retient X-Real-IP, posé par le routeur de l'hébergeur", () => {
    expect(adresseClient(requete({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }))).toBe(
      "203.0.113.7"
    );
  });

  // Un client écrit ce qu'il veut en tête de X-Forwarded-For : s'y fier lui donnerait un compteur neuf à volonté.
  it("sans X-Real-IP, retient la dernière adresse de X-Forwarded-For, pas celle que le client annonce", () => {
    expect(adresseClient(requete({ "x-forwarded-for": "1.2.3.4, 198.51.100.9 , 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("sans aucun en-tête (local) → un seul compteur commun", () => {
    expect(adresseClient(requete())).toBe("inconnue");
  });
});
