import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserRepository } from "./user.repository";
import type { User } from "../schema/users";
import type { FranceConnectUserInfo } from "@/features/auth";

// Mock du client DB — on teste la logique de branchement, pas Drizzle.
vi.mock("../client", () => ({
  db: {},
}));

describe("UserRepository.upsertFromFranceConnect — rattachement", () => {
  let repo: UserRepository;

  const fcInfo: FranceConnectUserInfo = {
    sub: "fc-sub-abc",
    given_name: "Alice",
    family_name: "Dupont",
    email: "alice@example.com",
  } as FranceConnectUserInfo;

  const stubUser: User = {
    id: "user-stub-1",
    fcId: null,
    nom: "Dupont",
    prenom: "Alice",
    email: "alice@example.com",
    emailContact: null,
    telephone: null,
    claimToken: "token-valid",
    claimTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    claimedAt: null,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingFcUser: User = {
    ...stubUser,
    id: "user-fc-1",
    fcId: "fc-sub-abc",
    claimToken: null,
    claimTokenExpiresAt: null,
  };

  beforeEach(() => {
    repo = new UserRepository();
  });

  it("prioritaire : claim token valide → claimStub", async () => {
    const claimStub = vi.spyOn(repo, "claimStub").mockResolvedValue({ ...stubUser, fcId: "fc-sub-abc" });
    const findByClaimToken = vi.spyOn(repo, "findByClaimToken").mockResolvedValue(stubUser);
    const findByFcId = vi.spyOn(repo, "findByFcId");

    const result = await repo.upsertFromFranceConnect(fcInfo, { claimToken: "token-valid" });

    expect(findByClaimToken).toHaveBeenCalledWith("token-valid");
    expect(claimStub).toHaveBeenCalledWith(stubUser.id, fcInfo);
    expect(findByFcId).not.toHaveBeenCalled();
    expect(result.fcId).toBe("fc-sub-abc");
  });

  it("claim token invalide → fallback sur findByFcId", async () => {
    vi.spyOn(repo, "findByClaimToken").mockResolvedValue(null);
    const findByFcId = vi.spyOn(repo, "findByFcId").mockResolvedValue(existingFcUser);
    const update = vi.spyOn(repo, "update").mockResolvedValue(existingFcUser);

    const result = await repo.upsertFromFranceConnect(fcInfo, { claimToken: "token-expired" });

    expect(findByFcId).toHaveBeenCalledWith("fc-sub-abc");
    expect(update).toHaveBeenCalled();
    expect(result.id).toBe(existingFcUser.id);
  });

  it("sans token, fcId connu → update du user existant", async () => {
    const findByClaimToken = vi.spyOn(repo, "findByClaimToken");
    vi.spyOn(repo, "findByFcId").mockResolvedValue(existingFcUser);
    vi.spyOn(repo, "update").mockResolvedValue(existingFcUser);

    await repo.upsertFromFranceConnect(fcInfo);

    expect(findByClaimToken).not.toHaveBeenCalled();
  });

  it("sans token, fcId inconnu, stub email match → claimStub par email", async () => {
    vi.spyOn(repo, "findByFcId").mockResolvedValue(null);
    const findByEmail = vi.spyOn(repo, "findByEmailWithoutFcId").mockResolvedValue(stubUser);
    const claimStub = vi.spyOn(repo, "claimStub").mockResolvedValue({ ...stubUser, fcId: "fc-sub-abc" });

    const result = await repo.upsertFromFranceConnect(fcInfo);

    expect(findByEmail).toHaveBeenCalledWith("alice@example.com");
    expect(claimStub).toHaveBeenCalledWith(stubUser.id, fcInfo);
    expect(result.fcId).toBe("fc-sub-abc");
  });

  it("sans token, fcId inconnu, pas de stub email → création normale", async () => {
    vi.spyOn(repo, "findByFcId").mockResolvedValue(null);
    vi.spyOn(repo, "findByEmailWithoutFcId").mockResolvedValue(null);
    const create = vi.spyOn(repo, "create").mockResolvedValue({ ...existingFcUser, id: "user-new" });

    const result = await repo.upsertFromFranceConnect(fcInfo);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        fcId: "fc-sub-abc",
        email: "alice@example.com",
      })
    );
    expect(result.id).toBe("user-new");
  });

  it("userInfo sans email → pas de fallback email", async () => {
    vi.spyOn(repo, "findByFcId").mockResolvedValue(null);
    const findByEmail = vi.spyOn(repo, "findByEmailWithoutFcId");
    vi.spyOn(repo, "create").mockResolvedValue({ ...existingFcUser, id: "user-new" });

    await repo.upsertFromFranceConnect({ ...fcInfo, email: undefined } as FranceConnectUserInfo);

    expect(findByEmail).not.toHaveBeenCalled();
  });
});
