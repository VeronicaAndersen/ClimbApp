import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock, clearCacheMock, saveTokensMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  clearCacheMock: vi.fn(),
  saveTokensMock: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  api: apiMock,
  clearCache: clearCacheMock,
  tokens: { saveTokens: saveTokensMock },
}));

import * as service from "../api";

type HttpMethod = keyof typeof apiMock;

interface ApiCase {
  name: string;
  method: HttpMethod;
  args: unknown[];
  invoke: () => Promise<unknown>;
}

const payload = { sample: true } as never;
const registrationPayload = { username: "climber" } as never;
const params = { comp_id: 12, level: 3, problem_no: 4 };

const apiCases: ApiCase[] = [
  {
    name: "loginClimber",
    method: "post",
    args: ["/auth/login", payload],
    invoke: () => service.loginClimber(payload),
  },
  {
    name: "signupClimber",
    method: "post",
    args: ["/auth/signup", registrationPayload],
    invoke: () => service.signupClimber(registrationPayload),
  },
  {
    name: "getMyInfo",
    method: "get",
    args: ["/climber/me", true],
    invoke: () => service.getMyInfo(),
  },
  {
    name: "updateMyInfo",
    method: "patch",
    args: ["/climber/me", payload, true],
    invoke: () => service.updateMyInfo(payload),
  },
  {
    name: "getClimberById",
    method: "get",
    args: ["/climber/12"],
    invoke: () => service.getClimberById(12),
  },
  {
    name: "getAllClimbers",
    method: "get",
    args: ["/climber", true],
    invoke: () => service.getAllClimbers(),
  },
  {
    name: "updateClimberById",
    method: "patch",
    args: ["/climber/12", payload, true],
    invoke: () => service.updateClimberById(12, payload),
  },
  {
    name: "deleteClimberById",
    method: "delete",
    args: ["/climber/12", true],
    invoke: () => service.deleteClimberById(12),
  },
  {
    name: "getClimberRegistrations",
    method: "get",
    args: ["/climber/12/registrations", true],
    invoke: () => service.getClimberRegistrations(12),
  },
  {
    name: "registerClimber",
    method: "post",
    args: ["/climber", registrationPayload],
    invoke: () => service.registerClimber(registrationPayload),
  },
  {
    name: "createCompetition",
    method: "post",
    args: ["/competition", payload, true],
    invoke: () => service.createCompetition(payload),
  },
  {
    name: "getCompetitions",
    method: "get",
    args: ["/competition"],
    invoke: () => service.getCompetitions(),
  },
  {
    name: "updateCompetitionById",
    method: "patch",
    args: ["/competition/12", payload, true],
    invoke: () => service.updateCompetitionById(12, payload),
  },
  {
    name: "deleteCompetitionById",
    method: "delete",
    args: ["/competition/12", true],
    invoke: () => service.deleteCompetitionById(12),
  },
  {
    name: "getCompRegistrationInfo",
    method: "get",
    args: ["/competition/12/registration", true],
    invoke: () => service.getCompRegistrationInfo(12),
  },
  {
    name: "checkRegistration",
    method: "get",
    args: ["/competition/12/registration/check", true],
    invoke: () => service.checkRegistration(12),
  },
  {
    name: "registerClimberToCompetition",
    method: "post",
    args: ["/competition/12/register", { level: 3 }, true],
    invoke: () => service.registerClimberToCompetition(12, 3),
  },
  {
    name: "withdrawRegistration",
    method: "delete",
    args: ["/competition/12/registration", true],
    invoke: () => service.withdrawRegistration(12),
  },
  {
    name: "getAllRegistrations",
    method: "get",
    args: ["/competition/12/registrations", true, true],
    invoke: () => service.getAllRegistrations(12),
  },
  {
    name: "updateRegistrationApproval",
    method: "patch",
    args: ["/competition/12/registration/34", { approved: true }, true],
    invoke: () => service.updateRegistrationApproval(12, 34, true),
  },
  {
    name: "updateRegistrationLevel",
    method: "patch",
    args: ["/competition/12/registration/34/level", { level: 3 }, true],
    invoke: () => service.updateRegistrationLevel(12, 34, 3),
  },
  {
    name: "createSeason",
    method: "post",
    args: ["/season", payload, true],
    invoke: () => service.createSeason(payload),
  },
  {
    name: "getSeasons",
    method: "get",
    args: ["/season", true],
    invoke: () => service.getSeasons(),
  },
  {
    name: "getSeasonById",
    method: "get",
    args: ["/season/12", true],
    invoke: () => service.getSeasonById(12),
  },
  {
    name: "updateSeasonById",
    method: "patch",
    args: ["/season/12", payload, true],
    invoke: () => service.updateSeasonById(12, payload),
  },
  {
    name: "deleteSeasonById",
    method: "delete",
    args: ["/season/12", true],
    invoke: () => service.deleteSeasonById(12),
  },
  {
    name: "getScoresBatch",
    method: "get",
    args: ["/competitions/12/level/3/scores/batch", true],
    invoke: () => service.getScoresBatch(params),
  },
  {
    name: "updateScore",
    method: "put",
    args: ["/competitions/12/level/3/problems/4/score", payload, true],
    invoke: () => service.updateScore(params, payload),
  },
  {
    name: "updateScoreBatch",
    method: "put",
    args: ["/competitions/12/level/3/scores/batch", payload, true],
    invoke: () => service.updateScoreBatch(params, payload),
  },
  {
    name: "getLevelStats",
    method: "get",
    args: ["/competitions/12/level/3/stats", true],
    invoke: () => service.getLevelStats(params),
  },
  {
    name: "getUserScoresBatch",
    method: "get",
    args: ["/competitions/12/level/3/users/34/scores", true],
    invoke: () => service.getUserScoresBatch(params, 34),
  },
  {
    name: "getLeaderboard",
    method: "get",
    args: ["/competition/12/leaderboard", true, true],
    invoke: () => service.getLeaderboard(12),
  },
  {
    name: "getSeasonStandings",
    method: "get",
    args: ["/season/12/standings", true, true],
    invoke: () => service.getSeasonStandings(12),
  },
  {
    name: "requestPasswordReset",
    method: "post",
    args: ["/auth/password-reset/request", payload],
    invoke: () => service.requestPasswordReset(payload),
  },
  {
    name: "confirmPasswordReset",
    method: "post",
    args: ["/auth/password-reset/confirm", payload],
    invoke: () => service.confirmPasswordReset(payload),
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("API service wrappers", () => {
  it.each(apiCases)(
    "$name delegates to the expected endpoint and returns its response",
    async ({ method, args, invoke }) => {
      const response = { ok: true };
      apiMock[method].mockResolvedValue(response);

      await expect(invoke()).resolves.toBe(response);
      expect(apiMock[method]).toHaveBeenCalledTimes(1);
      expect(apiMock[method]).toHaveBeenCalledWith(...args);
    }
  );

  it.each(apiCases)("$name propagates API failures", async ({ method, invoke }) => {
    const error = new Error("Network failure");
    apiMock[method].mockRejectedValue(error);

    await expect(invoke()).rejects.toBe(error);
  });
});

describe("authentication side effects", () => {
  it.each([
    ["loginClimber", service.loginClimber],
    ["signupClimber", service.signupClimber],
  ])(
    "%s clears cache before the request and saves returned tokens",
    async (_name, authenticate) => {
      const response = { access_token: "access", refresh_token: "refresh" };
      apiMock.post.mockResolvedValue(response);

      await expect(authenticate(payload)).resolves.toBe(response);

      expect(clearCacheMock).toHaveBeenCalledTimes(1);
      expect(saveTokensMock).toHaveBeenCalledWith(response);
      expect(clearCacheMock.mock.invocationCallOrder[0]).toBeLessThan(
        apiMock.post.mock.invocationCallOrder[0]
      );
      expect(apiMock.post.mock.invocationCallOrder[0]).toBeLessThan(
        saveTokensMock.mock.invocationCallOrder[0]
      );
    }
  );

  it("does not save tokens when authentication fails", async () => {
    const error = new Error("Invalid credentials");
    apiMock.post.mockRejectedValue(error);

    await expect(service.loginClimber(payload)).rejects.toBe(error);
    expect(clearCacheMock).toHaveBeenCalledTimes(1);
    expect(saveTokensMock).not.toHaveBeenCalled();
  });
});

describe("edge cases", () => {
  it("omits the competition query when the name is empty", async () => {
    apiMock.get.mockResolvedValue([]);

    await service.getCompetitions("");

    expect(apiMock.get).toHaveBeenCalledWith("/competition");
  });

  it("URL-encodes competition names in the query string", async () => {
    apiMock.get.mockResolvedValue([]);

    await service.getCompetitions("Youth & Open");

    expect(apiMock.get).toHaveBeenCalledWith("/competition?name=Youth%20%26%20Open");
  });

  it("preserves zero-valued ids, levels, and problem numbers", async () => {
    apiMock.get.mockResolvedValue({});
    apiMock.put.mockResolvedValue({});

    await service.getClimberById(0);
    await service.getScoresBatch({ comp_id: 0, level: 0 });
    await service.updateScore({ comp_id: 0, level: 0, problem_no: 0 }, payload);

    expect(apiMock.get).toHaveBeenNthCalledWith(1, "/climber/0");
    expect(apiMock.get).toHaveBeenNthCalledWith(2, "/competitions/0/level/0/scores/batch", true);
    expect(apiMock.put).toHaveBeenCalledWith(
      "/competitions/0/level/0/problems/0/score",
      payload,
      true
    );
  });

  it("preserves a false registration approval value", async () => {
    apiMock.patch.mockResolvedValue({});

    await service.updateRegistrationApproval(12, 34, false);

    expect(apiMock.patch).toHaveBeenCalledWith(
      "/competition/12/registration/34",
      { approved: false },
      true
    );
  });
});
