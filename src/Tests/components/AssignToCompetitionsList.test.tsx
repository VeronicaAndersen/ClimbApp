import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AssignToCompetitionsList } from "../../components/AssignToCompetitionsList";
import { APPROVAL_POLL_INTERVAL_MS } from "@/hooks/useMyRegistrations";

const { getCompetitionsMock, getMyRegistrationsMock, withdrawRegistrationMock } = vi.hoisted(
  () => ({
    getCompetitionsMock: vi.fn(),
    getMyRegistrationsMock: vi.fn(),
    withdrawRegistrationMock: vi.fn(),
  })
);

vi.mock("@/services/api", () => ({
  getCompetitions: getCompetitionsMock,
  getMyRegistrations: getMyRegistrationsMock,
  withdrawRegistration: withdrawRegistrationMock,
}));
vi.mock("../../components/SessionSwitcher", () => ({ SessionSwitcher: () => null }));

const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

let compDate = localDate(0);

const registration = (approved: boolean) => [
  {
    comp_id: 1,
    competition_name: "Höstcupen",
    comp_date: compDate,
    level: 2,
    approved,
    created_at: "2026-01-01",
  },
];

function mockCompetition(date: string) {
  compDate = date;
  getCompetitionsMock.mockResolvedValue([{ id: 1, name: "Höstcupen", comp_date: date }]);
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
  getCompetitionsMock.mockReset();
  getMyRegistrationsMock.mockReset();
  withdrawRegistrationMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AssignToCompetitionsList approval refresh", () => {
  it("re-checks a pending registration on the competition day", async () => {
    mockCompetition(localDate(0));
    getMyRegistrationsMock.mockResolvedValueOnce(registration(false));
    renderList();
    await advance();

    expect(screen.getByText("⏳ Väntar på godkännande")).toBeInTheDocument();
    expect(screen.getByText("Uppdateras automatiskt")).toBeInTheDocument();

    getMyRegistrationsMock.mockResolvedValueOnce(registration(true));
    await advance(APPROVAL_POLL_INTERVAL_MS);

    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("✓ Registrerad och godkänd")).toBeInTheDocument();

    // Approved: no more polling.
    await advance(APPROVAL_POLL_INTERVAL_MS * 2);
    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);
  });

  it("re-checks a pending registration when the tab becomes visible", async () => {
    mockCompetition(localDate(0));
    getMyRegistrationsMock.mockResolvedValueOnce(registration(false));
    renderList();
    await advance();

    getMyRegistrationsMock.mockResolvedValueOnce(registration(true));
    // Browsers fire it on document and let it bubble to window.
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    await advance();

    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("✓ Registrerad och godkänd")).toBeInTheDocument();
  });

  it("does not re-check an approved registration when the tab becomes visible", async () => {
    mockCompetition(localDate(0));
    getMyRegistrationsMock.mockResolvedValue(registration(true));
    renderList();
    await advance();

    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    await advance();

    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(1);
  });

  it("does not poll for a competition on another day", async () => {
    mockCompetition(localDate(3));
    getMyRegistrationsMock.mockResolvedValue(registration(false));
    renderList();
    await advance();

    await advance(APPROVAL_POLL_INTERVAL_MS * 2);

    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Uppdateras automatiskt")).not.toBeInTheDocument();
  });

  it("shows the register form again after withdrawing a pending registration", async () => {
    mockCompetition(localDate(3));
    getMyRegistrationsMock.mockResolvedValueOnce(registration(false));
    withdrawRegistrationMock.mockResolvedValue(null);
    renderList();
    await advance();

    fireEvent.click(screen.getByRole("button", { name: /Dra tillbaka anmälan/ }));
    getMyRegistrationsMock.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "Ja, dra tillbaka" }));
    await advance();

    expect(withdrawRegistrationMock).toHaveBeenCalledWith(1);
    expect(getMyRegistrationsMock).toHaveBeenCalledTimes(2);
    expect(getCompetitionsMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("⏳ Väntar på godkännande")).not.toBeInTheDocument();
  });
});
