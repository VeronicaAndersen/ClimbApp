import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { CompetitionResponse, RegistrationWithCompetition } from "@/types";
import { useCompetitions } from "@/hooks/useCompetitions";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getCompetitionsMock, getMyRegistrationsMock } = vi.hoisted(() => ({
  getCompetitionsMock: vi.fn(),
  getMyRegistrationsMock: vi.fn(),
}));
vi.mock("@/services/api", () => ({
  getCompetitions: getCompetitionsMock,
  getMyRegistrations: getMyRegistrationsMock,
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

const registration = (comp_id: number, approved = false): RegistrationWithCompetition => ({
  comp_id,
  competition_name: `Cup ${comp_id}`,
  comp_date: "2026-01-10",
  level: 3,
  approved,
  created_at: "2026-01-01T10:00:00Z",
});

beforeEach(() => {
  getCompetitionsMock.mockReset();
  getMyRegistrationsMock.mockReset();
  getMyRegistrationsMock.mockResolvedValue([]);
});

describe("useCompetitions", () => {
  it("returns competitions merged with the registrations, in two requests", async () => {
    getCompetitionsMock.mockResolvedValue([competition(1), competition(2), competition(3)]);
    getMyRegistrationsMock.mockResolvedValue([registration(1, true), registration(3)]);

    const { result } = renderHookWithQueryClient(() => useCompetitions());
    expect(result.current.loading).toBe(true);
    expect(result.current.competitions).toEqual([]);
    expect(result.current.registrationStatus).toEqual({});

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.competitions.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(result.current.registrationStatus).toEqual({ 1: true, 2: false, 3: true });
    expect(result.current.registrations).toEqual({
      1: registration(1, true),
      3: registration(3),
    });
    expect(getCompetitionsMock).toHaveBeenCalledTimes(1);
    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(1);
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

  it("lists competitions as not registered, with an error, when registrations fail", async () => {
    getCompetitionsMock.mockResolvedValue([competition(1)]);
    getMyRegistrationsMock.mockRejectedValue(new Error("Failed to fetch"));

    const { result } = renderHookWithQueryClient(() => useCompetitions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.competitions.map((c) => c.id)).toEqual([1]);
    expect(result.current.registrationStatus).toEqual({ 1: false });
    expect(result.current.error).toBe(
      "Kunde inte ansluta till servern. Kontrollera din internetanslutning."
    );
  });

  it("refreshes the registrations without refetching the competitions", async () => {
    getCompetitionsMock.mockResolvedValue([competition(1), competition(2)]);
    getMyRegistrationsMock.mockResolvedValue([registration(1)]);
    const { result } = renderHookWithQueryClient(() => useCompetitions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let resolveRegistrations: (regs: RegistrationWithCompetition[]) => void = () => {};
    getMyRegistrationsMock.mockReturnValueOnce(
      new Promise<RegistrationWithCompetition[]>((resolve) => {
        resolveRegistrations = resolve;
      })
    );
    let refresh: Promise<void> = Promise.resolve();
    act(() => {
      refresh = result.current.refreshRegistrationStatus(2);
    });
    expect(result.current.checkingRegistration).toEqual({ 2: true });

    await act(async () => {
      resolveRegistrations([registration(1), registration(2)]);
      await refresh;
    });

    expect(result.current.checkingRegistration).toEqual({ 2: false });
    expect(result.current.registrationStatus).toEqual({ 1: true, 2: true });
    expect(getCompetitionsMock).toHaveBeenCalledTimes(1);
    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);
  });

  it("refetches when refetch is called or refreshKey changes", async () => {
    getCompetitionsMock.mockResolvedValue([]);
    const { result, rerender } = renderHookWithQueryClient(
      ({ refreshKey }: { refreshKey: number }) => useCompetitions(refreshKey),
      { initialProps: { refreshKey: 0 } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    getCompetitionsMock.mockResolvedValue([competition(1)]);
    getMyRegistrationsMock.mockResolvedValue([registration(1)]);
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.registrationStatus).toEqual({ 1: true }));
    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);

    rerender({ refreshKey: 1 });
    await waitFor(() => expect(getCompetitionsMock).toHaveBeenCalledTimes(3));
  });
});
