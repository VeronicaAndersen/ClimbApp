import { describe, it, expect } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  normalizeUsername,
  validatePassword,
  validatePersonName,
  validatePlainText,
  validateUsername,
} from "../../utils/inputValidation";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Alice ")).toBe("alice");
  });

  it("strips what Python's str.strip() strips", () => {
    expect(normalizeUsername("alice\u0085")).toBe("alice");
    expect(normalizeUsername("\u001Calice\u001F")).toBe("alice");
    expect(normalizeUsername("\u3000alice\u00A0")).toBe("alice");
  });

  it("keeps a leading BOM, which Python does not strip", () => {
    expect(normalizeUsername("\uFEFFalice")).toBe("\uFEFFalice");
    expect(validateUsername("\uFEFFalice")).toBe(
      "Användarnamnet får inte innehålla kontrolltecken eller osynliga tecken."
    );
  });

  it("accepts a name that only has U+0085 at the end", () => {
    expect(validateUsername("alice\u0085")).toBeNull();
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

describe("validatePlainText (email, club)", () => {
  it("accepts ordinary text", () => {
    expect(validatePlainText("Klätterklubben Grepp", "Klubb")).toBeNull();
    expect(validatePlainText("alice@example.com", "E-post")).toBeNull();
  });

  it.each([
    ["NUL", "a\u0000b"],
    ["newline", "a\nb"],
    ["DEL", "a\u007Fb"],
    ["C1 control", "a\u009Fb"],
    ["lone surrogate", "a\uD800b"],
    ["zero-width space", "a\u200Bb"],
    ["zero-width joiner", "a\u200Db"],
    ["BOM", "\uFEFFab"],
    ["bidi override", "a\u202Eb"],
  ])("rejects a %s", (_name, value) => {
    expect(validatePlainText(value, "Klubb")).toBe(
      "Klubb får inte innehålla kontrolltecken eller osynliga tecken."
    );
  });
});

describe("validatePersonName (first and last name)", () => {
  it("accepts names, including ZWJ and ZWNJ", () => {
    expect(validatePersonName("Åsa-Öberg", "Förnamn")).toBeNull();
    expect(validatePersonName("\u0645\u06CC\u200C\u062E\u0648\u0627\u0645", "Förnamn")).toBeNull();
    expect(validatePersonName("👩\u200D🚀", "Förnamn")).toBeNull();
  });

  it.each([
    ["NUL", "a\u0000b"],
    ["tab", "a\tb"],
    ["lone surrogate", "a\uDC00b"],
    ["LRE", "a\u202Ab"],
    ["RLO", "a\u202Eb"],
    ["LRI", "a\u2066b"],
    ["PDI", "a\u2069b"],
  ])("rejects a %s", (_name, value) => {
    expect(validatePersonName(value, "Efternamn")).toBe(
      "Efternamn får inte innehålla kontrolltecken eller tecken som ändrar textriktningen."
    );
  });
});
