import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import type { MyInfoResponse } from "@/types";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import { renderHookWithQueryClient } from "../utils/renderWithQueryClient";

const { getMyInfoMock } = vi.hoisted(() => ({ getMyInfoMock: vi.fn() }));
vi.mock("@/services/api", () => ({ getMyInfo: getMyInfoMock }));

const me: MyInfoResponse = {
  id: 7,
  username: "climber",
  user_scope: "user",
  created_at: "2026-01-01",
  email: "climber@example.com",
  firstname: "Alex",
  lastname: "Climber",
  club: "Grepp",
};

beforeEach(() => {
  getMyInfoMock.mockReset();
});

describe("useGetUserInfo", () => {
  it("starts loading and then returns the user info", async () => {
    getMyInfoMock.mockResolvedValue(me);
    const { result } = renderHookWithQueryClient(() => useGetUserInfo());

    expect(result.current.loading).toBe(true);
    expect(result.current.userInfo).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userInfo).toEqual(me);
    expect(result.current.messageInfo).toBeNull();
  });

  it("returns a red message when the request fails", async () => {
    getMyInfoMock.mockRejectedValue(new Error("Failed to fetch"));
    const { result } = renderHookWithQueryClient(() => useGetUserInfo());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messageInfo).toEqual({
      message: "Ett fel uppstod vid hämtning av användarinformation.",
      color: "red",
    });
    expect(result.current.userInfo).toBeNull();
  });

  it("refetches when refetch is called", async () => {
    getMyInfoMock.mockResolvedValue(me);
    const { result } = renderHookWithQueryClient(() => useGetUserInfo());
    await waitFor(() => expect(result.current.loading).toBe(false));

    getMyInfoMock.mockResolvedValue({ ...me, firstname: "Kim" });
    await act(() => result.current.refetch());

    await waitFor(() => expect(result.current.userInfo?.firstname).toBe("Kim"));
    expect(getMyInfoMock).toHaveBeenCalledTimes(2);
  });
});
