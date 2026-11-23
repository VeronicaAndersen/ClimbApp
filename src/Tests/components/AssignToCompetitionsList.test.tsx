import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  APPROVAL_POLL_INTERVAL_MS,
  AssignToCompetitionsList,
} from "../../components/AssignToCompetitionsList";

const { getCompRegistrationInfoMock, useCompetitionsMock } = vi.hoisted(() => ({
  getCompRegistrationInfoMock: vi.fn(),
  useCompetitionsMock: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  getCompRegistrationInfo: getCompRegistrationInfoMock,
  withdrawRegistration: vi.fn(),
}));
vi.mock("@/hooks/useCompetitions", () => ({ useCompetitions: useCompetitionsMock }));
vi.mock("../../components/SessionSwitcher", () => ({ SessionSwitcher: () => null }));

const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const registration = (approved: boolean) => ({
  comp_id: 1,
  user_id: 7,
  level: 2,
  approved,
  created_at: "2026-01-01",
});

function mockCompetition(compDate: string) {
  useCompetitionsMock.mockReturnValue({
    competitions: [{ id: 1, name: "Höstcupen", comp_date: compDate }],
    loading: false,
    error: null,
    registrationStatus: { 1: true },
    checkingRegistration: {},
    refreshRegistrationStatus: vi.fn(),
    refetch: vi.fn(),
  });
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  getCompRegistrationInfoMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AssignToCompetitionsList approval refresh", () => {
  it("re-checks a pending registration on the competition day", async () => {
    mockCompetition(localDate(0));
    getCompRegistrationInfoMock.mockResolvedValueOnce(registration(false));
    render(<AssignToCompetitionsList />);
    await flush();

    expect(screen.getByText("⏳ Väntar på godkännande")).toBeInTheDocument();
    expect(screen.getByText("Uppdateras automatiskt")).toBeInTheDocument();

    getCompRegistrationInfoMock.mockResolvedValueOnce(registration(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(APPROVAL_POLL_INTERVAL_MS);
    });

    expect(getCompRegistrationInfoMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("✓ Registrerad och godkänd")).toBeInTheDocument();

    // Approved: no more polling.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(APPROVAL_POLL_INTERVAL_MS * 2);
    });
    expect(getCompRegistrationInfoMock).toHaveBeenCalledTimes(2);
  });

  it("does not poll for a competition on another day", async () => {
    mockCompetition(localDate(3));
    getCompRegistrationInfoMock.mockResolvedValue(registration(false));
    render(<AssignToCompetitionsList />);
    await flush();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(APPROVAL_POLL_INTERVAL_MS * 2);
    });

    expect(getCompRegistrationInfoMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Uppdateras automatiskt")).not.toBeInTheDocument();
  });
});
