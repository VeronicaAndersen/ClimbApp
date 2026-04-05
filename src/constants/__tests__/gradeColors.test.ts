import { describe, it, expect } from "vitest";
import { getGradeColor, GRADE_COLORS, LEVEL_NAMES, DEFAULT_GRADE_COLOR } from "../gradeColors";

describe("LEVEL_NAMES", () => {
  it("has entries for levels 1 through 7", () => {
    for (let i = 1; i <= 7; i++) {
      expect(LEVEL_NAMES[i]).toBeDefined();
      expect(typeof LEVEL_NAMES[i]).toBe("string");
    }
  });

  it("has the correct Swedish color names", () => {
    expect(LEVEL_NAMES[1]).toBe("Lila");
    expect(LEVEL_NAMES[2]).toBe("Rosa");
    expect(LEVEL_NAMES[3]).toBe("Orange");
    expect(LEVEL_NAMES[4]).toBe("Gul");
    expect(LEVEL_NAMES[5]).toBe("Grön");
    expect(LEVEL_NAMES[6]).toBe("Vit");
    expect(LEVEL_NAMES[7]).toBe("Svart");
  });
});

describe("GRADE_COLORS", () => {
  it("has entries for levels 1 through 7", () => {
    for (let i = 1; i <= 7; i++) {
      expect(GRADE_COLORS[i]).toBeDefined();
    }
  });

  it("all colors are valid hex strings", () => {
    Object.values(GRADE_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe("getGradeColor", () => {
  it("returns the correct color for each valid level", () => {
    for (let i = 1; i <= 7; i++) {
      expect(getGradeColor(i)).toBe(GRADE_COLORS[i]);
    }
  });

  it("returns DEFAULT_GRADE_COLOR for undefined", () => {
    expect(getGradeColor(undefined)).toBe(DEFAULT_GRADE_COLOR);
  });

  it("returns DEFAULT_GRADE_COLOR for null", () => {
    expect(getGradeColor(null)).toBe(DEFAULT_GRADE_COLOR);
  });

  it("returns DEFAULT_GRADE_COLOR for 0", () => {
    expect(getGradeColor(0)).toBe(DEFAULT_GRADE_COLOR);
  });

  it("returns DEFAULT_GRADE_COLOR for an out-of-range level", () => {
    expect(getGradeColor(99)).toBe(DEFAULT_GRADE_COLOR);
  });

  it("returns DEFAULT_GRADE_COLOR for a negative level", () => {
    expect(getGradeColor(-1)).toBe(DEFAULT_GRADE_COLOR);
  });
});
