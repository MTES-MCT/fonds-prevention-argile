import { describe, it, expect } from "vitest";
import { assertEmailDevInboxSafety } from "./env.config";

describe("assertEmailDevInboxSafety", () => {
  it("OK si EMAIL_DEV_INBOX absente", () => {
    expect(() => assertEmailDevInboxSafety(true, undefined)).not.toThrow();
    expect(() => assertEmailDevInboxSafety(false, undefined)).not.toThrow();
  });

  it("throw en production même avec domaine autorisé", () => {
    expect(() => assertEmailDevInboxSafety(true, "ops@beta.gouv.fr")).toThrow(
      /not allowed in production/
    );
  });

  it("throw si domaine non autorisé", () => {
    expect(() => assertEmailDevInboxSafety(false, "attacker@hostile.com")).toThrow(
      /domain not allowed/
    );
  });

  it("OK si domaine autorisé hors production", () => {
    expect(() => assertEmailDevInboxSafety(false, "ops@beta.gouv.fr")).not.toThrow();
  });

  it("matching domaine case-insensitive", () => {
    expect(() => assertEmailDevInboxSafety(false, "Ops@BETA.GOUV.FR")).not.toThrow();
  });

  it("rejette les emails sans @", () => {
    expect(() => assertEmailDevInboxSafety(false, "no-at-sign")).toThrow(/domain not allowed/);
  });
});
