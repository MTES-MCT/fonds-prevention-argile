import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isLocal, isProduction, getServerEnv } from "@/shared/config/env.config";
import { resolveBrevoContactEmail, isBrevoContactSyncEnabled } from "./brevo-contacts.config";
import type { User } from "@/shared/database/schema/users";

vi.mock("@/shared/config/env.config", () => ({
  isLocal: vi.fn(),
  isProduction: vi.fn(),
  getServerEnv: vi.fn(),
}));

const mockedIsLocal = vi.mocked(isLocal);
const mockedIsProduction = vi.mocked(isProduction);
const mockedGetServerEnv = vi.mocked(getServerEnv);

const user = (over: Partial<User> = {}): Pick<User, "id" | "email" | "emailContact"> => ({
  id: "abc123",
  email: "jean.dupont@gmail.com",
  emailContact: null,
  ...over,
});

const ORIGINAL_ENV = { ...process.env };

describe("brevo-contacts.config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BREVO_API_KEY = "key";
    process.env.EMAIL_DEV_INBOX = "marie@beta.gouv.fr";
    mockedIsLocal.mockReturnValue(false);
    mockedIsProduction.mockReturnValue(false);
    mockedGetServerEnv.mockReturnValue({ BREVO_CONTACT_LIST_ID: 7 } as ReturnType<typeof getServerEnv>);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("resolveBrevoContactEmail", () => {
    it("local -> null (jamais de push)", () => {
      mockedIsLocal.mockReturnValue(true);
      expect(resolveBrevoContactEmail(user())).toBeNull();
    });

    it("sans clé Brevo -> null", () => {
      delete process.env.BREVO_API_KEY;
      expect(resolveBrevoContactEmail(user())).toBeNull();
    });

    it("production -> vrai email (emailContact prioritaire)", () => {
      mockedIsProduction.mockReturnValue(true);
      expect(resolveBrevoContactEmail(user({ emailContact: "contact@gmail.com" }))).toBe("contact@gmail.com");
      expect(resolveBrevoContactEmail(user({ emailContact: null }))).toBe("jean.dupont@gmail.com");
    });

    it("staging -> sous-adresse de EMAIL_DEV_INBOX, jamais le vrai email", () => {
      const resolved = resolveBrevoContactEmail(user({ id: "u-42" }));
      expect(resolved).toBe("marie+uu-42@beta.gouv.fr");
      expect(resolved).not.toContain("jean.dupont");
    });

    it("staging sans EMAIL_DEV_INBOX -> null (garde-fou anti-fuite)", () => {
      delete process.env.EMAIL_DEV_INBOX;
      expect(resolveBrevoContactEmail(user())).toBeNull();
    });
  });

  describe("isBrevoContactSyncEnabled", () => {
    it("false en local", () => {
      mockedIsLocal.mockReturnValue(true);
      expect(isBrevoContactSyncEnabled()).toBe(false);
    });

    it("false sans liste configurée", () => {
      mockedGetServerEnv.mockReturnValue({ BREVO_CONTACT_LIST_ID: undefined } as ReturnType<typeof getServerEnv>);
      expect(isBrevoContactSyncEnabled()).toBe(false);
    });

    it("true en staging avec clé + liste", () => {
      expect(isBrevoContactSyncEnabled()).toBe(true);
    });
  });
});
