import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MAX_COOLDOWN_SECONDS, useCooldown } from "../../hooks/useCooldown";
import { ApiError } from "../../lib/apiError";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCooldown", () => {
  it("is not cooling down initially", () => {
    const { result } = renderHook(() => useCooldown());
    expect(result.current.isCoolingDown).toBe(false);
  });

  it("cools down for the given seconds", () => {
    const { result } = renderHook(() => useCooldown());

    act(() => result.current.startCooldown(30));
    expect(result.current.isCoolingDown).toBe(true);

    act(() => vi.advanceTimersByTime(29_999));
    expect(result.current.isCoolingDown).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.isCoolingDown).toBe(false);
  });

  it.each([null, 0, -5])("ignores a wait of %j", (seconds) => {
    const { result } = renderHook(() => useCooldown());

    act(() => result.current.startCooldown(seconds));
    expect(result.current.isCoolingDown).toBe(false);
  });

  it("caps very long waits", () => {
    const { result } = renderHook(() => useCooldown());

    act(() => result.current.startCooldown(MAX_COOLDOWN_SECONDS * 10));
    act(() => vi.advanceTimersByTime(MAX_COOLDOWN_SECONDS * 1000));
    expect(result.current.isCoolingDown).toBe(false);
  });

  it("starts from a 429's Retry-After", () => {
    const { result } = renderHook(() => useCooldown());
    const error = new ApiError({ status: 429, message: "x", retryAfterSeconds: 5 });

    act(() => result.current.startCooldownFor(error));
    expect(result.current.isCoolingDown).toBe(true);

    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.isCoolingDown).toBe(false);
  });

  it("ignores errors that are not rate limits", () => {
    const { result } = renderHook(() => useCooldown());

    act(() => result.current.startCooldownFor(new ApiError({ status: 401, message: "x" })));
    act(() => result.current.startCooldownFor(new Error("network")));
    expect(result.current.isCoolingDown).toBe(false);
  });

  it("clears its timer on unmount", () => {
    const { result, unmount } = renderHook(() => useCooldown());

    act(() => result.current.startCooldown(10));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
