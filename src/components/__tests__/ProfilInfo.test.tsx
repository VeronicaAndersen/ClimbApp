import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Theme } from "@radix-ui/themes";
import ProfilInfo from "../ProfilInfo";

const { useGetUserInfoMock, useUserCompetitionsMock } = vi.hoisted(() => ({
  useGetUserInfoMock: vi.fn(),
  useUserCompetitionsMock: vi.fn(),
}));

vi.mock("@/hooks/useGetUserInfo", () => ({ default: useGetUserInfoMock }));
vi.mock("@/hooks/useUserCompetitions", () => ({
  useUserCompetitions: useUserCompetitionsMock,
}));
vi.mock("@/services/api", () => ({ updateMyInfo: vi.fn() }));

describe("ProfilInfo name editing accessibility", () => {
  beforeEach(() => {
    useGetUserInfoMock.mockReturnValue({
      userInfo: {
        id: 1,
        username: "climber",
        user_scope: "user",
        created_at: "2025-01-01",
        email: "climber@example.com",
        firstname: "Alex",
        lastname: "Climber",
        club: "Grepp",
      },
      messageInfo: null,
      loading: false,
      refetch: vi.fn(),
    });
    useUserCompetitionsMock.mockReturnValue({
      competitions: [],
      isLoading: false,
      error: null,
    });
  });

  it("provides an accessible edit action and labeled name fields", async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <ProfilInfo />
      </Theme>
    );

    await user.click(screen.getByRole("button", { name: "Ändra namn" }));

    expect(screen.getByRole("textbox", { name: "Förnamn" })).toHaveValue("Alex");
    expect(screen.getByRole("textbox", { name: "Efternamn" })).toHaveValue("Climber");
  });
});
