import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { CompetitionResponse } from "@/types";
import { useCompetitions } from "@/hooks/useCompetitions";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getCompetitionsMock, checkRegistrationMock } = vi.hoisted(() => ({
  getCompetitionsMock: vi.fn(),
  checkRegistrationMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  getCompetitions: getCompetitionsMock,
  checkRegistration: checkRegistrationMock,
}));

const competition = (id: number): CompetitionResponse => ({
  id,
  name: `Cup ${id}`,
  description: "",
  comp_type: "qualifier",
  comp_date: "2026-01-10",
  season_id: 1,
  round_no: null,
});

beforeEach(() => {
  getCompetitionsMock.mockReset();
  checkRegistrationMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("useCompetitions", () => {
  it("returns competitions merged with the registration status", async () => {
    getCompetitionsMock.mockResolvedValue([competition(1), competition(2), competition(3)]);
    checkRegistrationMock.mockImplementation(async (id: number) => {
      if (id === 3) throw new Error("Failed to fetch");
      return id === 1;
    });

    const { result } = renderHookWithQueryClient(() => useCompetitions());
    expect(result.current.loading).toBe(true);
    expect(result.current.competitions).toEqual([]);
    expect(result.current.registrationStatus).toEqual({});

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.competitions.map((c) => c.id)).toEqual([1, 2, 3]);
    // A failed check counts as not registered.
    expect(result.current.registrationStatus).toEqual({ 1: true, 2: false, 3: false });
  });

  it("returns a user-friendly error when the competitions request fails", async () => {
    getCompetitionsMock.mockRejectedValue(new Error("Failed to fetch"));

    const { result } = renderHookWithQueryClient(() => useCompetitions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
    expect(result.current.competitions).toEqual([]);
  });

  it("refreshes one competition's status without refetching the list", async () => {
    getCompetitionsMock.mockResolvedValue([competition(1), competition(2)]);
    checkRegistrationMock.mockResolvedValue(true);
    const { result } = renderHookWithQueryClient(() => useCompetitions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let resolveCheck: (registered: boolean) => void = () => {};
    checkRegistrationMock.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        resolveCheck = resolve;
      })
    );
    let refresh: Promise<void> = Promise.resolve();
    act(() => {
      refresh = result.current.refreshRegistrationStatus(2);
    });
    expect(result.current.checkingRegistration).toEqual({ 2: true });

    await act(async () => {
      resolveCheck(false);
      await refresh;
    });

    expect(result.current.checkingRegistration).toEqual({ 2: false });
    expect(result.current.registrationStatus).toEqual({ 1: true, 2: false });
    expect(getCompetitionsMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when refetch is called or refreshKey changes", async () => {
    getCompetitionsMock.mockResolvedValue([]);
    const { result, rerender } = renderHookWithQueryClient(
      ({ refreshKey }: { refreshKey: number }) => useCompetitions(refreshKey),
      { initialProps: { refreshKey: 0 } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    getCompetitionsMock.mockResolvedValue([competition(1)]);
    checkRegistrationMock.mockResolvedValue(true);
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.registrationStatus).toEqual({ 1: true }));

    rerender({ refreshKey: 1 });
    await waitFor(() => expect(getCompetitionsMock).toHaveBeenCalledTimes(3));
  });
});
