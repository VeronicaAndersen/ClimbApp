import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("returns a single class name unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("combines multiple class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out undefined", () => {
    expect(cn("a", undefined, "b")).toBe("a b");
  });

  it("filters out null", () => {
    expect(cn("a", null, "b")).toBe("a b");
  });

  it("filters out false", () => {
    expect(cn("a", false, "b")).toBe("a b");
  });

  it("handles conditional object syntax — true includes class", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("handles conditional object syntax — false excludes class", () => {
    expect(cn({ active: false })).toBe("");
  });

  it("handles mixed strings and objects", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("merges conflicting tailwind padding classes (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("merges conflicting tailwind text color classes (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("does not merge non-conflicting tailwind classes", () => {
    const result = cn("px-4", "py-2");
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns empty string for all-falsy arguments", () => {
    expect(cn(undefined, null, false)).toBe("");
  });

  it("handles array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("handles nested arrays", () => {
    expect(cn([["a", "b"], "c"])).toBe("a b c");
  });
});
