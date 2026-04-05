import { describe, it, expect } from "vitest";
import { getUserFriendlyError } from "../errorMessages";

describe("getUserFriendlyError", () => {
  describe("null / undefined input", () => {
    it("handles null", () => {
      expect(getUserFriendlyError(null)).toBe("Ett oväntat fel uppstod. Försök igen.");
    });

    it("handles undefined", () => {
      expect(getUserFriendlyError(undefined)).toBe("Ett oväntat fel uppstod. Försök igen.");
    });

    it("handles non-Error objects", () => {
      expect(getUserFriendlyError({ code: 42 })).toBe("Ett oväntat fel uppstod. Försök igen.");
    });
  });

  describe("network errors", () => {
    it("handles network error keyword", () => {
      expect(getUserFriendlyError(new Error("network error"))).toContain("internetanslutning");
    });

    it("handles fetch error keyword", () => {
      expect(getUserFriendlyError(new Error("Failed to fetch"))).toContain("internetanslutning");
    });

    it("handles timeout", () => {
      expect(getUserFriendlyError(new Error("Request timeout"))).toContain("svarade inte i tid");
    });
  });

  describe("authentication errors", () => {
    it("handles 401 status", () => {
      expect(getUserFriendlyError(new Error("401 Unauthorized"))).toContain("session");
    });

    it("handles 403 status", () => {
      expect(getUserFriendlyError(new Error("403 Forbidden"))).toContain("behörighet");
    });

    it("handles invalid credentials", () => {
      expect(getUserFriendlyError(new Error("invalid credentials"))).toContain("lösenord");
    });
  });

  describe("validation errors", () => {
    it("handles IFSC top-without-bonus rule", () => {
      const result = getUserFriendlyError(new Error("ifsc: top implies zone"));
      expect(result).toContain("bonus");
    });

    it("handles attempts_to_top < attempts_to_bonus", () => {
      const result = getUserFriendlyError(
        new Error("attempts_to_top must be >= attempts_to_bonus")
      );
      expect(result).toContain("topp");
    });

    it("handles 404 not found", () => {
      expect(getUserFriendlyError(new Error("404 not found"))).toContain("hitta");
    });

    it("handles 500 internal server error", () => {
      expect(getUserFriendlyError(new Error("500 internal server error"))).toContain("serverfel");
    });

    it("handles 400 bad request", () => {
      expect(getUserFriendlyError(new Error("400 bad request"))).toContain("Ogiltig");
    });

    it("handles duplicate / already exists", () => {
      expect(getUserFriendlyError(new Error("already exists"))).toContain("redan");
    });
  });

  describe("string input", () => {
    it("accepts a plain string", () => {
      const result = getUserFriendlyError("network failure");
      expect(result).toContain("internetanslutning");
    });
  });

  describe("already user-friendly Swedish messages", () => {
    it("passes through messages containing 'misslyckades'", () => {
      const msg = "Misslyckades att hämta data";
      expect(getUserFriendlyError(new Error(msg))).toBe(msg);
    });

    it("passes through messages containing 'kunde inte'", () => {
      const msg = "Kunde inte ansluta";
      expect(getUserFriendlyError(new Error(msg))).toBe(msg);
    });
  });

  describe("technical error prefix stripping", () => {
    it("strips 'Error:' prefix from message", () => {
      const result = getUserFriendlyError(
        new Error("Error: something went wrong unexpectedly here")
      );
      expect(result).not.toMatch(/^Error:/);
    });
  });
});
