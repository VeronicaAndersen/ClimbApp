import { describe, it, expect } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  containsControlCharacters,
  normalizeUsername,
  validatePassword,
  validateTextField,
  validateUsername,
} from "../../utils/inputValidation";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Alice ")).toBe("alice");
  });
});

describe("validateUsername", () => {
  it("accepts a normal username", () => {
    expect(validateUsername("Alice_99")).toBeNull();
  });

  it("leaves empty input to the form's required check", () => {
    expect(validateUsername("")).toBeNull();
  });

  it("rejects a username that is only whitespace", () => {
    expect(validateUsername("   ")).toBe("Användarnamnet får inte bara innehålla mellanslag.");
  });

  it("accepts exactly the maximum length after trimming", () => {
    expect(validateUsername(`  ${"a".repeat(USERNAME_MAX_LENGTH)}  `)).toBeNull();
  });

  it("rejects more than the maximum length", () => {
    expect(validateUsername("a".repeat(USERNAME_MAX_LENGTH + 1))).toBe(
      "Användarnamnet får vara högst 200 tecken."
    );
  });

  it("counts length after lowercasing, like the API", () => {
    // "İ" lowercases to two code points ("i" + combining dot).
    expect(validateUsername("İ".repeat(USERNAME_MAX_LENGTH))).toBe(
      "Användarnamnet får vara högst 200 tecken."
    );
  });

  it("counts characters outside the BMP once", () => {
    expect(validateUsername("🧗".repeat(USERNAME_MAX_LENGTH))).toBeNull();
  });

  it.each([
    ["NUL", "ali\u0000ce"],
    ["tab", "ali\tce"],
    ["zero-width space", "ali\u200Bce"],
    ["right-to-left override", "ali\u202Ece"],
    ["lone surrogate", "ali\uD800ce"],
  ])("rejects a %s", (_name, value) => {
    expect(validateUsername(value)).toBe(
      "Användarnamnet får inte innehålla kontrolltecken eller osynliga tecken."
    );
  });

  it("accepts letters with diacritics", () => {
    expect(validateUsername("Åsa-Öberg")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("leaves empty input to the form's required check", () => {
    expect(validatePassword("", { requireMinLength: true })).toBeNull();
  });

  it("enforces the minimum length only when asked", () => {
    expect(validatePassword("abc", { requireMinLength: true })).toBe(
      "Lösenordet måste innehålla minst 6 tecken."
    );
    expect(validatePassword("abc", { requireMinLength: false })).toBeNull();
  });

  it("accepts exactly the maximum length", () => {
    expect(
      validatePassword("x".repeat(PASSWORD_MAX_LENGTH), { requireMinLength: true })
    ).toBeNull();
  });

  it("rejects more than the maximum length", () => {
    expect(validatePassword("x".repeat(PASSWORD_MAX_LENGTH + 1), { requireMinLength: false })).toBe(
      "Lösenordet får vara högst 1024 tecken."
    );
  });
});

describe("validateTextField", () => {
  it("accepts ordinary text, including invisible format characters", () => {
    expect(validateTextField("Klätterklubben Grepp", "Klubb")).toBeNull();
    expect(validateTextField("a\u200Bb", "Klubb")).toBeNull();
  });

  it.each(["a\u0000b", "a\nb", "a\u007Fb", "a\u009Fb"])(
    "rejects control characters in %j",
    (value) => {
      expect(validateTextField(value, "Förnamn")).toBe(
        "Förnamn får inte innehålla kontrolltecken."
      );
    }
  );
});

describe("containsControlCharacters", () => {
  it("is false for plain text", () => {
    expect(containsControlCharacters("alice@example.com")).toBe(false);
  });
});
