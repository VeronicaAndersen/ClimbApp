import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { ClimberResponse } from "@/types";
import { useClimbers } from "@/hooks/useClimbers";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getAllClimbersMock } = vi.hoisted(() => ({ getAllClimbersMock: vi.fn() }));
vi.mock("@/services/api", () => ({ getAllClimbers: getAllClimbersMock }));

const climber: ClimberResponse = {
  id: 7,
  username: "blomma",
  user_scope: "climber",
  created_at: "2026-01-01",
  email: "blomma@example.com",
  firstname: "Blomma",
  lastname: "Gren",
  club: "",
};

beforeEach(() => {
  getAllClimbersMock.mockReset();
});

describe("useClimbers", () => {
  it("starts loading and then returns the climbers", async () => {
    getAllClimbersMock.mockResolvedValue([climber]);
    const { result } = renderHookWithQueryClient(() => useClimbers());

    expect(result.current.loading).toBe(true);
    expect(result.current.climbers).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.climbers).toEqual([climber]);
    expect(result.current.error).toBeNull();
  });

  it("returns a user-friendly error when the request fails", async () => {
    getAllClimbersMock.mockRejectedValue(new Error("Failed to fetch"));
    const { result } = renderHookWithQueryClient(() => useClimbers());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(result.current.climbers).toEqual([]);
  });

  it("refetches when refetch is called", async () => {
    getAllClimbersMock.mockResolvedValue([]);
    const { result } = renderHookWithQueryClient(() => useClimbers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    getAllClimbersMock.mockResolvedValue([climber]);
    await act(() => result.current.refetch());

    await waitFor(() => expect(result.current.climbers).toEqual([climber]));
  });

  it("refetches when refreshKey changes", async () => {
    getAllClimbersMock.mockResolvedValue([]);
    const { result, rerender } = renderHookWithQueryClient(
      ({ refreshKey }: { refreshKey: number }) => useClimbers(refreshKey),
      { initialProps: { refreshKey: 0 } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    getAllClimbersMock.mockResolvedValue([climber]);
    rerender({ refreshKey: 1 });

    await waitFor(() => expect(result.current.climbers).toEqual([climber]));
    expect(getAllClimbersMock).toHaveBeenCalledTimes(2);
  });
});
