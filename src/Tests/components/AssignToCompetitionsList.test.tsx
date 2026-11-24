import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AssignToCompetitionsList } from "../../components/AssignToCompetitionsList";
import { APPROVAL_POLL_INTERVAL_MS } from "@/hooks/useRegistrationDetails";

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

function renderList() {
  // Same focus default as production, so only the hook's own option refetches.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AssignToCompetitionsList />
    </QueryClientProvider>
  );
}

/** Moves the fake clock, then gives React Query's own timers a tick to render the result. */
async function advance(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
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
    renderList();
    await advance();

    expect(screen.getByText("⏳ Väntar på godkännande")).toBeInTheDocument();
    expect(screen.getByText("Uppdateras automatiskt")).toBeInTheDocument();

    getCompRegistrationInfoMock.mockResolvedValueOnce(registration(true));
    await advance(APPROVAL_POLL_INTERVAL_MS);

    expect(getCompRegistrationInfoMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("✓ Registrerad och godkänd")).toBeInTheDocument();

    // Approved: no more polling.
    await advance(APPROVAL_POLL_INTERVAL_MS * 2);
    expect(getCompRegistrationInfoMock).toHaveBeenCalledTimes(2);
  });

  it("re-checks a pending registration when the tab becomes visible", async () => {
    mockCompetition(localDate(0));
    getCompRegistrationInfoMock.mockResolvedValueOnce(registration(false));
    renderList();
    await advance();

    getCompRegistrationInfoMock.mockResolvedValueOnce(registration(true));
    // Browsers fire it on document and let it bubble to window.
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    await advance();

    expect(getCompRegistrationInfoMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("✓ Registrerad och godkänd")).toBeInTheDocument();
  });

  it("does not re-check an approved registration when the tab becomes visible", async () => {
    mockCompetition(localDate(0));
    getCompRegistrationInfoMock.mockResolvedValue(registration(true));
    renderList();
    await advance();

    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    await advance();

    expect(getCompRegistrationInfoMock).toHaveBeenCalledTimes(1);
  });

  it("does not poll for a competition on another day", async () => {
    mockCompetition(localDate(3));
    getCompRegistrationInfoMock.mockResolvedValue(registration(false));
    renderList();
    await advance();

    await advance(APPROVAL_POLL_INTERVAL_MS * 2);

    expect(getCompRegistrationInfoMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Uppdateras automatiskt")).not.toBeInTheDocument();
  });
});
