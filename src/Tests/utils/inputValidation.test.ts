import { describe, it, expect } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  NEW_USERNAME_CHARACTERS_MESSAGE,
  NEW_USERNAME_EMPTY_MESSAGE,
  NEW_USERNAME_SPACES_MESSAGE,
  NEW_USERNAME_TOO_MANY_MARKS_MESSAGE,
  normalizeNewUsername,
  normalizeUsername,
  validateNewUsername,
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

describe("normalizeNewUsername", () => {
  it("strips, applies NFKC and lowercases", () => {
    expect(normalizeNewUsername("  Anna ")).toBe("anna");
    expect(normalizeNewUsername("\uFF41dmin")).toBe("admin"); // fullwidth "ａdmin"
    expect(normalizeNewUsername("\uFF21DMIN")).toBe("admin"); // fullwidth "ＡDMIN"
  });
});

describe("validateNewUsername (signup and username changes)", () => {
  it.each([
    "åsa",
    "Märta",
    "björn",
    "josé",
    "søren",
    "anna karin",
    "anna@example.com",
    "a.b_c-d",
    "klättrare99",
  ])("accepts %j", (value) => {
    expect(validateNewUsername(value)).toBeNull();
  });

  it("accepts a fullwidth name, which normalizes to ASCII", () => {
    expect(validateNewUsername("\uFF41dmin")).toBeNull();
  });

  it("accepts a combining mark after a letter, and after a mark after a letter", () => {
    expect(validateNewUsername("a\u0332")).toBeNull();
    expect(validateNewUsername("a\u0332\u0333")).toBeNull();
  });

  it("leaves empty input to the form's required check", () => {
    expect(validateNewUsername("")).toBeNull();
  });

  it("rejects a name that is only whitespace", () => {
    expect(validateNewUsername("   ")).toBe(NEW_USERNAME_EMPTY_MESSAGE);
  });

  it("counts length after NFKC", () => {
    expect(validateNewUsername("a".repeat(200))).toBeNull();
    expect(validateNewUsername("a".repeat(201))).toBe("Användarnamnet får vara högst 200 tecken.");
    // U+FB00 "ﬀ" becomes "ff" under NFKC.
    expect(validateNewUsername("\uFB00".repeat(101))).toBe(
      "Användarnamnet får vara högst 200 tecken."
    );
  });

  it.each([
    ["two spaces in a row", "anna  karin"],
    ["NBSP next to a space", "anna \u00A0karin"],
    ["a space created by NFKC at the start", "\u00A8anna"],
  ])("rejects %s", (_name, value) => {
    expect(validateNewUsername(value)).toBe(NEW_USERNAME_SPACES_MESSAGE);
  });

  it.each([
    ["emoji", "blomma\u{1F338}"],
    ["symbol", "anna+karin"],
    ["slash", "anna/karin"],
    ["mark at the start", "\u0301anna"],
    ["mark after a digit", "anna1\u0301"],
    ["mark after a space", "anna \u0301b"],
    ["zero-width joiner", "an\u200Dna"],
    ["soft hyphen", "an\u00ADna"],
    ["Hangul filler (a letter)", "an\u3164na"],
    ["Mongolian variation selector (a mark)", "a\u180Bnna"],
    ["variation selector after a letter", "a\uFE0Fnna"],
    ["tag character", "anna\u{E0041}"],
    ["leading BOM", "\uFEFFanna"],
    ["control character", "an\u0000na"],
  ])("rejects a %s", (_name, value) => {
    expect(validateNewUsername(value)).toBe(NEW_USERNAME_CHARACTERS_MESSAGE);
  });

  it("stays lenient at login: emoji are still accepted there", () => {
    expect(validateNewUsername("blomma\u{1F338}")).toBe(NEW_USERNAME_CHARACTERS_MESSAGE);
    expect(validateUsername("blomma\u{1F338}")).toBeNull();
  });
});

describe("validateNewUsername — accent marks and stretching letters", () => {
  it("accepts decomposed Vietnamese, which NFKC composes", () => {
    // "Nguyễn" with e + circumflex + tilde typed as combining marks.
    const decomposed = "Nguye\u0302\u0303n";
    expect(decomposed.normalize("NFKC")).toBe("Nguy\u1EC5n");
    expect(validateNewUsername(decomposed)).toBeNull();
  });

  it("accepts three marks that do not compose", () => {
    expect(validateNewUsername("a\u0332\u0333\u0334b")).toBeNull();
  });

  it("rejects four marks on one letter", () => {
    expect(validateNewUsername("a\u0332\u0333\u0334\u0335b")).toBe(
      NEW_USERNAME_TOO_MANY_MARKS_MESSAGE
    );
  });

  it("rejects a + five acutes: one composes into á, four stay", () => {
    const value = "a" + "\u0301".repeat(5);
    expect(value.normalize("NFKC")).toBe("\u00E1" + "\u0301".repeat(4));
    expect(validateNewUsername(value)).toBe(NEW_USERNAME_TOO_MANY_MARKS_MESSAGE);
  });

  it("counts marks per letter, not per name", () => {
    expect(validateNewUsername("a\u0332\u0333\u0334b\u0332\u0333\u0334")).toBeNull();
  });

  it.each([
    ["Arabic tatweel", "\u0645\u062D\u0640\u0645\u062F", "\u0645\u062D\u0645\u062F"],
    ["NKo lajanyalan", "\u07CA\u07FA\u07CB", "\u07CA\u07CB"],
  ])("rejects %s and accepts the same name without it", (_name, withIt, without) => {
    expect(validateNewUsername(withIt)).toBe(NEW_USERNAME_CHARACTERS_MESSAGE);
    expect(validateNewUsername(without)).toBeNull();
  });

  it("stays lenient at login for these characters", () => {
    expect(validateUsername("\u0645\u062D\u0640\u0645\u062F")).toBeNull();
  });
});
