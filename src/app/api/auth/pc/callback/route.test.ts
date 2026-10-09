import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/features/auth/adapters/proconnect/proconnect.service", () => ({
  handleProConnectCallback: vi.fn(),
  handleProConnectError: vi.fn(() => ({ code: "pc_error" })),
}));
vi.mock("@/features/auth", () => ({ getAndClearRedirectUrl: vi.fn(async () => null) }));
vi.mock("@/shared/config/env.config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/config/env.config")>()),
  getServerEnv: () => ({ BASE_URL: "https://app.test" }),
}));

import { GET } from "./route";
import { handleProConnectCallback } from "@/features/auth/adapters/proconnect/proconnect.service";
import { UserRole } from "@/shared/domain/value-objects";

const requete = () => new NextRequest("https://app.test/api/auth/pc/callback?code=c&state=s");

function cookiesEffaces(response: Response): string[] {
  return response.headers
    .getSetCookie()
    .filter((cookie) => /Expires=Thu, 01 Jan 1970/i.test(cookie) || /Max-Age=0/i.test(cookie))
    .map((cookie) => cookie.split("=")[0]);
}

describe("GET /api/auth/pc/callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refus pour absence de 2FA → message dédié et session antérieure effacée", async () => {
    vi.mocked(handleProConnectCallback).mockResolvedValue({
      success: false,
      code: "pc_mfa_required",
      shouldLogout: true,
    });

    const response = await GET(requete());

    expect(response.headers.get("location")).toBe("https://app.test/connexion/agent?error=pc_mfa_required");
    expect(cookiesEffaces(response)).toEqual(expect.arrayContaining(["session", "session_role", "session_auth"]));
  });

  it("erreur de sécurité → code générique et session effacée", async () => {
    vi.mocked(handleProConnectCallback).mockResolvedValue({ success: false, shouldLogout: true });

    const response = await GET(requete());

    expect(response.headers.get("location")).toContain("error=pc_security_error");
    expect(cookiesEffaces(response)).toContain("session");
  });

  it("succès → redirection par rôle, sans effacer de cookie", async () => {
    vi.mocked(handleProConnectCallback).mockResolvedValue({ success: true, role: UserRole.AMO });

    const response = await GET(requete());

    expect(response.headers.get("location")).not.toContain("error=");
    expect(cookiesEffaces(response)).toEqual([]);
  });
});
