import { describe, it, expect, vi, beforeEach } from "vitest";
import { processBrevoWebhook, isTrackedEvent, isValidBrevoPayload } from "./brevo-webhook.service";
import { db } from "@/shared/database/client";
import type { BrevoWebhookPayload, BrevoWebhookEvent } from "@/shared/domain/types/brevo-webhook.types";

// Mock des dépendances
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe("brevo-webhook.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isTrackedEvent", () => {
    it("devrait retourner true pour 'delivered'", () => {
      expect(isTrackedEvent("delivered")).toBe(true);
    });

    it("devrait retourner true pour 'opened'", () => {
      expect(isTrackedEvent("opened")).toBe(true);
    });

    it("devrait retourner true pour 'unique_opened'", () => {
      expect(isTrackedEvent("unique_opened")).toBe(true);
    });

    it("devrait retourner true pour 'click'", () => {
      expect(isTrackedEvent("click")).toBe(true);
    });

    it("devrait retourner true pour 'soft_bounce'", () => {
      expect(isTrackedEvent("soft_bounce")).toBe(true);
    });

    it("devrait retourner true pour 'hard_bounce'", () => {
      expect(isTrackedEvent("hard_bounce")).toBe(true);
    });

    it("devrait retourner false pour 'unsubscribed'", () => {
      expect(isTrackedEvent("unsubscribed")).toBe(false);
    });

    it("devrait retourner false pour 'complaint'", () => {
      expect(isTrackedEvent("complaint")).toBe(false);
    });

    it("devrait retourner false pour 'blocked'", () => {
      expect(isTrackedEvent("blocked")).toBe(false);
    });
  });

  describe("isValidBrevoPayload", () => {
    it("devrait retourner true pour un payload valide", () => {
      const payload = {
        event: "delivered",
        email: "test@example.com",
        "message-id": "msg-123",
      };

      expect(isValidBrevoPayload(payload)).toBe(true);
    });

    it("devrait retourner false si event est manquant", () => {
      const payload = {
        email: "test@example.com",
        "message-id": "msg-123",
      };

      expect(isValidBrevoPayload(payload)).toBe(false);
    });

    it("devrait retourner false si email est manquant", () => {
      const payload = {
        event: "delivered",
        "message-id": "msg-123",
      };

      expect(isValidBrevoPayload(payload)).toBe(false);
    });

    it("devrait retourner false si message-id est manquant", () => {
      const payload = {
        event: "delivered",
        email: "test@example.com",
      };

      expect(isValidBrevoPayload(payload)).toBe(false);
    });

    it("devrait retourner false si payload est null", () => {
      expect(isValidBrevoPayload(null)).toBe(false);
    });

    it("devrait retourner false si payload est undefined", () => {
      expect(isValidBrevoPayload(undefined)).toBe(false);
    });

    it("devrait retourner false si payload n'est pas un objet", () => {
      expect(isValidBrevoPayload("string")).toBe(false);
      expect(isValidBrevoPayload(123)).toBe(false);
      expect(isValidBrevoPayload([])).toBe(false);
    });

    it("devrait retourner false si event n'est pas une string", () => {
      const payload = {
        event: 123,
        email: "test@example.com",
        "message-id": "msg-123",
      };

      expect(isValidBrevoPayload(payload)).toBe(false);
    });
  });

  describe("processBrevoWebhook", () => {
    const basePayload: BrevoWebhookPayload = {
      event: "delivered",
      email: "amo@example.com",
      "message-id": "brevo-msg-123",
      ts_event: Date.now(),
    };

    const mockValidation = {
      id: "validation-001",
    };

    beforeEach(() => {
      // Mock par défaut : validation trouvée
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockValidation]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    // ===== Tests événements non suivis =====

    it("devrait ignorer les événements non suivis", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "unsubscribed",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(false);
      expect(result.error).toBe("Événement non suivi");
      expect(db.select).not.toHaveBeenCalled();
    });

    // ===== Tests validation non trouvée =====

    it("devrait retourner updated=false si la validation n'est pas trouvée", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await processBrevoWebhook(basePayload);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(false);
      expect(result.error).toBe("Validation AMO non trouvée pour ce messageId");
    });

    // ===== Tests événement delivered =====

    it("devrait traiter l'événement 'delivered'", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "delivered",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe("delivered");
      expect(result.updated).toBe(true);
      expect(db.update).toHaveBeenCalled();

      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith({
        emailDeliveredAt: expect.any(Date),
      });
    });

    // ===== Tests événement opened =====

    it("devrait traiter l'événement 'opened'", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "opened",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe("opened");
      expect(result.updated).toBe(true);
      expect(db.update).toHaveBeenCalled();

      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith({
        emailOpenedAt: expect.any(Date),
      });
    });

    it("devrait traiter l'événement 'unique_opened'", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "unique_opened",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe("unique_opened");
      expect(result.updated).toBe(true);
    });

    // ===== Tests événement click =====

    it("devrait traiter l'événement 'click'", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "click",
        link: "https://example.com/validation/token-123",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe("click");
      expect(result.updated).toBe(true);
      expect(db.update).toHaveBeenCalled();

      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith({
        emailClickedAt: expect.any(Date),
      });
    });

    // ===== Tests événements bounce =====

    it("devrait traiter l'événement 'soft_bounce'", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "soft_bounce",
        reason: "Mailbox full",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe("soft_bounce");
      expect(result.updated).toBe(true);
      expect(db.update).toHaveBeenCalled();

      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith({
        emailBounceType: "soft",
        emailBounceReason: "Mailbox full",
      });
    });

    it("devrait traiter l'événement 'hard_bounce'", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "hard_bounce",
        reason: "User unknown",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe("hard_bounce");
      expect(result.updated).toBe(true);
      expect(db.update).toHaveBeenCalled();

      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith({
        emailBounceType: "hard",
        emailBounceReason: "User unknown",
      });
    });

    it("devrait gérer un hard_bounce sans reason", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "hard_bounce",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(true);

      const updateCall = vi.mocked(db.update).mock.results[0];
      expect(updateCall.value.set).toHaveBeenCalledWith({
        emailBounceType: "hard",
        emailBounceReason: null,
      });
    });

    // ===== Tests de corrélation par messageId =====

    it("devrait chercher la validation par brevoMessageId", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        "message-id": "unique-brevo-id-456",
      };

      await processBrevoWebhook(payload);

      expect(db.select).toHaveBeenCalled();
    });

    // ===== Tests retour des infos =====

    it("devrait retourner le messageId dans le résultat", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        "message-id": "test-message-id-789",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.messageId).toBe("test-message-id-789");
    });

    it("devrait retourner l'event dans le résultat", async () => {
      const payload: BrevoWebhookPayload = {
        ...basePayload,
        event: "click",
      };

      const result = await processBrevoWebhook(payload);

      expect(result.event).toBe("click");
    });
  });
});
