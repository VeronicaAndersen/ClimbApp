import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useServerFieldErrors } from "../../hooks/useServerFieldErrors";
import { ApiError } from "../../lib/apiError";

const usernameTooLong = new ApiError({
  status: 422,
  message: "x",
  validationIssues: [{ loc: ["body", "username"], msg: "too long", type: "string_too_long" }],
});

function setup(initial: { username: string }) {
  return renderHook(({ values }) => useServerFieldErrors(values), {
    initialProps: { values: initial },
  });
}

describe("useServerFieldErrors", () => {
  it("shows a 422 on its field while the value is unchanged", () => {
    const { result, rerender } = setup({ username: "alice" });

    act(() => result.current.recordServerErrors(usernameTooLong, { username: "alice" }));
    expect(result.current.serverErrorFor("username")).toBe(
      "Användarnamnet får vara högst 200 tecken."
    );

    rerender({ values: { username: "alicia" } });
    expect(result.current.serverErrorFor("username")).toBeNull();
  });

  it("does not bring an old error back after clearServerErrors", () => {
    const { result, rerender } = setup({ username: "alice" });

    act(() => result.current.recordServerErrors(usernameTooLong, { username: "alice" }));
    act(() => result.current.clearServerErrors());

    rerender({ values: { username: "alice" } });
    expect(result.current.serverErrorFor("username")).toBeNull();
  });
});
