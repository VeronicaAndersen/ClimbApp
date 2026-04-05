import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "../useForm";

describe("useForm — initial values", () => {
  it("returns initial string values", () => {
    const { result } = renderHook(() => useForm({ name: "Alice", email: "" }));
    expect(result.current.values).toEqual({ name: "Alice", email: "" });
  });

  it("returns initial numeric values", () => {
    const { result } = renderHook(() => useForm({ count: 0, level: 1 }));
    expect(result.current.values).toEqual({ count: 0, level: 1 });
  });

  it("returns initial mixed values", () => {
    const { result } = renderHook(() =>
      useForm({ label: "x", score: 5, active: false })
    );
    expect(result.current.values).toEqual({ label: "x", score: 5, active: false });
  });
});

describe("useForm — handleChange", () => {
  it("updates a string field via text change event", () => {
    const { result } = renderHook(() => useForm({ username: "" }));
    act(() => {
      result.current.handleChange("username")({
        target: { type: "text", value: "bob" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.values.username).toBe("bob");
  });

  it("coerces number input type to a number", () => {
    const { result } = renderHook(() => useForm({ age: 0 }));
    act(() => {
      result.current.handleChange("age")({
        target: { type: "number", value: "25" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.values.age).toBe(25);
  });

  it("does not affect other fields when one changes", () => {
    const { result } = renderHook(() => useForm({ a: "x", b: "y" }));
    act(() => {
      result.current.handleChange("a")({
        target: { type: "text", value: "z" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.values.b).toBe("y");
  });

  it("updates a field to an empty string", () => {
    const { result } = renderHook(() => useForm({ city: "Stockholm" }));
    act(() => {
      result.current.handleChange("city")({
        target: { type: "text", value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.values.city).toBe("");
  });
});

describe("useForm — setValue", () => {
  it("sets a single field directly", () => {
    const { result } = renderHook(() => useForm({ score: 0 }));
    act(() => {
      result.current.setValue("score", 99);
    });
    expect(result.current.values.score).toBe(99);
  });

  it("does not affect other fields", () => {
    const { result } = renderHook(() => useForm({ x: 1, y: 2 }));
    act(() => {
      result.current.setValue("x", 10);
    });
    expect(result.current.values.y).toBe(2);
  });

  it("overwrites a previous value", () => {
    const { result } = renderHook(() => useForm({ name: "Alice" }));
    act(() => {
      result.current.setValue("name", "Bob");
    });
    act(() => {
      result.current.setValue("name", "Carol");
    });
    expect(result.current.values.name).toBe("Carol");
  });
});

describe("useForm — setValues (bulk merge)", () => {
  it("merges partial updates", () => {
    const { result } = renderHook(() => useForm({ a: 1, b: 2, c: 3 }));
    act(() => {
      result.current.setValues({ a: 10, c: 30 });
    });
    expect(result.current.values).toEqual({ a: 10, b: 2, c: 30 });
  });

  it("leaves unspecified fields unchanged", () => {
    const { result } = renderHook(() => useForm({ x: "hello", y: "world" }));
    act(() => {
      result.current.setValues({ x: "goodbye" });
    });
    expect(result.current.values.y).toBe("world");
  });

  it("handles empty partial update gracefully", () => {
    const { result } = renderHook(() => useForm({ val: "original" }));
    act(() => {
      result.current.setValues({});
    });
    expect(result.current.values.val).toBe("original");
  });
});

describe("useForm — reset", () => {
  it("reverts all fields to initial values", () => {
    const { result } = renderHook(() =>
      useForm({ name: "initial", count: 0 })
    );
    act(() => {
      result.current.setValue("name", "changed");
      result.current.setValue("count", 42);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.values).toEqual({ name: "initial", count: 0 });
  });

  it("is idempotent — resetting twice stays at initial values", () => {
    const { result } = renderHook(() => useForm({ val: "x" }));
    act(() => {
      result.current.setValue("val", "y");
    });
    act(() => {
      result.current.reset();
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.values.val).toBe("x");
  });

  it("does not throw when resetting without prior changes", () => {
    const { result } = renderHook(() => useForm({ a: 1 }));
    expect(() => {
      act(() => {
        result.current.reset();
      });
    }).not.toThrow();
  });
});
