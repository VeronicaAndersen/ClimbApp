import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import Tombola from "@/pages/Tombola";

const { getCompetitionsMock, getAllRegistrationsMock } = vi.hoisted(() => ({
  getCompetitionsMock: vi.fn(),
  getAllRegistrationsMock: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  getCompetitions: getCompetitionsMock,
  getAllRegistrations: getAllRegistrationsMock,
}));

const climbers: Record<number, { firstname: string; lastname: string }> = {
  7: { firstname: "Anna", lastname: "Berg" },
  8: { firstname: "Bo", lastname: "Ek" },
  9: { firstname: "Cia", lastname: "Lind" },
};

const registration = (user_id: number, approved = true, comp_id = 1) => ({
  comp_id,
  user_id,
  level: 2,
  approved,
  created_at: "2026-01-01",
  climber_name: `user${user_id}`,
  ...climbers[user_id],
});

function renderTombola() {
  return render(
    <MemoryRouter>
      <Theme>
        <Tombola />
      </Theme>
    </MemoryRouter>
  );
}

async function selectCompetition(user: ReturnType<typeof userEvent.setup>) {
  const select = await screen.findByLabelText("Tävling");
  await user.selectOptions(select, "1");
  await screen.findByText("Kvarvarande (2)");
}

const remainingList = () =>
  screen.getByRole("heading", { name: /Kvarvarande/ }).parentElement as HTMLElement;

const winnersList = () =>
  screen.getByRole("heading", { name: /^Vinnare \(/ }).parentElement as HTMLElement;

async function spin() {
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: /Dra vinnare/ }));
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  vi.useRealTimers();
}

beforeEach(() => {
  localStorage.clear();
  getCompetitionsMock.mockResolvedValue([
    { id: 1, name: "Höstcupen", comp_date: "2026-10-01" },
    { id: 2, name: "Vårcupen", comp_date: "2026-04-01" },
  ]);
  getAllRegistrationsMock.mockResolvedValue([
    registration(7),
    registration(8),
    registration(9, false),
  ]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Tombola", () => {
  it("lists the competitions in the selector", async () => {
    renderTombola();

    const select = await screen.findByLabelText("Tävling");
    expect(
      within(select).getByRole("option", { name: "Höstcupen (2026-10-01)" })
    ).toBeInTheDocument();
    expect(
      within(select).getByRole("option", { name: "Vårcupen (2026-04-01)" })
    ).toBeInTheDocument();
    expect(screen.getByText("Välj en tävling ovan för att starta tombolan")).toBeInTheDocument();
  });

  it("loads only the approved participants of the picked competition", async () => {
    const user = userEvent.setup();
    renderTombola();
    await selectCompetition(user);

    expect(getAllRegistrationsMock).toHaveBeenCalledTimes(1);
    expect(getAllRegistrationsMock).toHaveBeenCalledWith(1);
    expect(within(remainingList()).getByText("Anna Berg")).toBeInTheDocument();
    expect(within(remainingList()).getByText("Bo Ek")).toBeInTheDocument();
    expect(screen.queryByText("Cia Lind")).not.toBeInTheDocument();
  });

  it("keeps the newest competition when an older one answers late", async () => {
    let answerFirst: (regs: unknown[]) => void = () => {};
    getAllRegistrationsMock.mockImplementation((compId: number) =>
      compId === 1
        ? new Promise((resolve) => {
            answerFirst = resolve;
          })
        : Promise.resolve([registration(9, true, 2)])
    );
    const user = userEvent.setup();
    renderTombola();

    const select = await screen.findByLabelText("Tävling");
    await user.selectOptions(select, "1");
    await user.selectOptions(select, "2");
    await screen.findByText("Kvarvarande (1)");
    await act(async () => answerFirst([registration(7), registration(8)]));

    expect(within(remainingList()).getByText("Cia Lind")).toBeInTheDocument();
    expect(screen.queryByText("Anna Berg")).not.toBeInTheDocument();
    expect(screen.getByText("Kvarvarande (1)")).toBeInTheDocument();
  });

  it("adds and removes a guest kept on this device only", async () => {
    const user = userEvent.setup();
    renderTombola();
    await selectCompetition(user);

    await user.type(screen.getByLabelText("Lägg till person"), "  Gästen  ");
    await user.click(screen.getByRole("button", { name: "Lägg till" }));

    expect(screen.getByText("Kvarvarande (3)")).toBeInTheDocument();
    expect(within(remainingList()).getByText("Gästen")).toBeInTheDocument();
    expect(screen.getByLabelText("Lägg till person")).toHaveValue("");
    const saved = JSON.parse(localStorage.getItem("tombola_1") ?? "{}");
    expect(saved.guests).toEqual([expect.objectContaining({ name: "Gästen", level: null })]);

    await user.click(screen.getByRole("button", { name: "Ta bort Gästen" }));
    expect(screen.getByText("Kvarvarande (2)")).toBeInTheDocument();
    expect(screen.queryByText("Gästen")).not.toBeInTheDocument();
  });

  it("draws winners from the remaining pool until it is empty, and reset clears them", async () => {
    const user = userEvent.setup();
    renderTombola();
    await selectCompetition(user);
    expect(screen.getByRole("button", { name: /Återställ/ })).toBeDisabled();

    await spin();
    expect(screen.getByText("Vinnare #1")).toBeInTheDocument();
    expect(within(winnersList()).getAllByText(/Anna Berg|Bo Ek/)).toHaveLength(1);
    expect(screen.getByText("Kvarvarande (1)")).toBeInTheDocument();
    const firstWinner = within(winnersList()).getByText(/Anna Berg|Bo Ek/).textContent;
    const stillLeft = firstWinner === "Anna Berg" ? "Bo Ek" : "Anna Berg";
    expect(within(remainingList()).getByText(stillLeft)).toBeInTheDocument();

    await spin();
    expect(screen.getByText("Vinnare #2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vinnare (2)" })).toBeInTheDocument();
    const order = within(winnersList())
      .getAllByText(/Anna Berg|Bo Ek/)
      .map((el) => el.textContent);
    expect(order).toEqual([firstWinner, stillLeft]);
    expect(screen.queryByRole("heading", { name: /Kvarvarande/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dra vinnare/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Återställ/ }));
    expect(screen.queryByRole("heading", { name: /^Vinnare \(/ })).not.toBeInTheDocument();
    expect(screen.getByText("Kvarvarande (2)")).toBeInTheDocument();
    expect(screen.getByText('Tryck på "Dra vinnare" för att börja')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("tombola_1") ?? "{}").winnerKeys).toEqual([]);
  });
});
