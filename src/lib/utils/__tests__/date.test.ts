import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "../date";

describe("Date utilities", () => {
  describe("formatDate", () => {
    it("should format a valid date string correctly", () => {
      expect(formatDate("2024-03-15")).toBe("15/03/2024");
      expect(formatDate("2024-01-01")).toBe("01/01/2024");
      expect(formatDate("2024-12-31")).toBe("31/12/2024");
    });

    it("should format a date with time correctly", () => {
      expect(formatDate("2024-03-15T14:30:00")).toBe("15/03/2024");
      expect(formatDate("2024-03-15T23:59:59")).toBe("15/03/2024");
    });

    it("should handle ISO 8601 dates", () => {
      expect(formatDate("2024-03-15T14:30:00Z")).toBe("15/03/2024");
      expect(formatDate("2024-03-15T14:30:00+02:00")).toBe("15/03/2024");
    });

    it("should return default value for null", () => {
      expect(formatDate(null)).toBe("—");
    });

    it("should return default value for undefined", () => {
      expect(formatDate(undefined)).toBe("—");
    });

    it("should return default value for empty string", () => {
      expect(formatDate("")).toBe("—");
    });

    it("should return default value for invalid date string", () => {
      expect(formatDate("invalid-date")).toBe("—");
      expect(formatDate("2024-13-45")).toBe("—");
      expect(formatDate("abc123")).toBe("—");
    });
  });

  describe("formatDateTime", () => {
    it("should format date and time correctly", () => {
      // Note: Le format exact peut varier selon l'environnement Node.js
      // On teste la présence des éléments attendus
      const result = formatDateTime("2024-03-15T14:30:00");
      expect(result).toContain("15/03/2024");
      expect(result).toMatch(/14:30|14 h 30|2:30/); // Différents formats possibles
    });

    it("should handle midnight correctly", () => {
      const result = formatDateTime("2024-03-15T00:00:00");
      expect(result).toContain("15/03/2024");
      expect(result).toMatch(/00:00|00 h 00|12:00/);
    });

    it("should handle noon correctly", () => {
      const result = formatDateTime("2024-03-15T12:00:00");
      expect(result).toContain("15/03/2024");
      expect(result).toMatch(/12:00|12 h 00/);
    });

    it("should return default value for null", () => {
      expect(formatDateTime(null)).toBe("—");
    });

    it("should return default value for undefined", () => {
      expect(formatDateTime(undefined)).toBe("—");
    });

    it("should return default value for empty string", () => {
      expect(formatDateTime("")).toBe("—");
    });

    it("should return default value for invalid date", () => {
      expect(formatDateTime("invalid-date")).toBe("—");
    });

    it("should handle timezone offsets", () => {
      const result = formatDateTime("2024-03-15T14:30:00Z");
      expect(result).toContain("/03/2024");
      expect(result).toMatch(/\d{2}:\d{2}|\d{2} h \d{2}/);
    });
  });
});
