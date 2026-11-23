import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { RegistrationWithClimber } from "@/types";
import { useRegistrations } from "@/hooks/useRegistrations";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getAllRegistrationsMock } = vi.hoisted(() => ({ getAllRegistrationsMock: vi.fn() }));
vi.mock("@/services/api", () => ({ getAllRegistrations: getAllRegistrationsMock }));

const registration = (userId: number): RegistrationWithClimber => ({
  comp_id: 3,
  user_id: userId,
  level: 2,
  approved: false,
  created_at: "2026-01-01T10:00:00Z",
  climber_name: `Klättrare ${userId}`,
});

beforeEach(() => {
  getAllRegistrationsMock.mockReset();
});

describe("useRegistrations", () => {
  it("returns the competition's registrations", async () => {
    getAllRegistrationsMock.mockResolvedValue([registration(7)]);
    const { result } = renderHookWithQueryClient(() => useRegistrations(3));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.registrations).toEqual([registration(7)]);
    expect(result.current.error).toBeNull();
    expect(getAllRegistrationsMock).toHaveBeenCalledWith(3);
  });

  it("returns a user-friendly error when the request fails", async () => {
    getAllRegistrationsMock.mockRejectedValue(new Error("Failed to fetch"));
    const { result } = renderHookWithQueryClient(() => useRegistrations(3));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(result.current.registrations).toEqual([]);
  });

  it("applies a change to one registration without refetching", async () => {
    getAllRegistrationsMock.mockResolvedValue([registration(7), registration(8)]);
    const { result } = renderHookWithQueryClient(() => useRegistrations(3));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.applyChange(7, { approved: true, level: 5 }));

    await waitFor(() =>
      expect(result.current.registrations).toEqual([
        { ...registration(7), approved: true, level: 5 },
        registration(8),
      ])
    );
    expect(getAllRegistrationsMock).toHaveBeenCalledTimes(1);
  });

  it("keeps each competition's registrations apart", async () => {
    getAllRegistrationsMock.mockImplementation(async (id: number) => [
      { ...registration(7), comp_id: id },
    ]);
    const { result, rerender } = renderHookWithQueryClient(
      ({ competitionId }: { competitionId: number }) => useRegistrations(competitionId),
      { initialProps: { competitionId: 3 } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ competitionId: 4 });

    await waitFor(() => expect(result.current.registrations[0]?.comp_id).toBe(4));
  });

  it("refetches when refreshKey changes", async () => {
    getAllRegistrationsMock.mockResolvedValue([]);
    const { result, rerender } = renderHookWithQueryClient(
      ({ refreshKey }: { refreshKey: number }) => useRegistrations(3, refreshKey),
      { initialProps: { refreshKey: 0 } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    getAllRegistrationsMock.mockResolvedValue([registration(7)]);
    rerender({ refreshKey: 1 });

    await waitFor(() => expect(result.current.registrations).toEqual([registration(7)]));
    expect(getAllRegistrationsMock).toHaveBeenCalledTimes(2);
  });
});
