import { describe, expect, it } from "vitest";
import { ApiError, type ValidationIssue } from "../../lib/apiError";
import {
  fieldErrorsFromError,
  formatProblemList,
  problemErrorsFromBatchError,
} from "../../utils/validationIssues";

const unprocessable = (validationIssues: ValidationIssue[]) =>
  new ApiError({ status: 422, message: "x", validationIssues });

describe("fieldErrorsFromError", () => {
  it("maps each field to a Swedish message, never the English msg", () => {
    const errors = fieldErrorsFromError(
      unprocessable([
        {
          loc: ["body", "username"],
          msg: "String should have at most 200 characters",
          type: "string_too_long",
        },
        {
          loc: ["body", "password"],
          msg: "String should have at least 6 characters",
          type: "string_too_short",
        },
        { loc: ["body", "email"], msg: "Value error, must not contain ...", type: "value_error" },
        {
          loc: ["body", "firstname"],
          msg: "Value error, must not contain ...",
          type: "value_error",
        },
        { loc: ["body", "lastname"], msg: "Field required", type: "missing" },
      ])
    );

    expect(errors).toEqual({
      username: "Användarnamnet får vara högst 200 tecken.",
      password: "Lösenordet måste innehålla minst 6 tecken.",
      email: "E-post får inte innehålla kontrolltecken eller osynliga tecken.",
      firstname:
        "Förnamn får inte innehålla kontrolltecken eller tecken som ändrar textriktningen.",
      lastname: "Efternamn måste fyllas i.",
    });
  });

  it("keeps the first issue per field", () => {
    const errors = fieldErrorsFromError(
      unprocessable([
        { loc: ["body", "club"], msg: "a", type: "value_error" },
        { loc: ["body", "club"], msg: "b", type: "missing" },
      ])
    );
    expect(errors.club).toBe("Klubb får inte innehålla kontrolltecken eller osynliga tecken.");
  });

  it("ignores issues about the whole body and non-422 errors", () => {
    expect(
      fieldErrorsFromError(unprocessable([{ loc: ["body"], msg: "x", type: "json_invalid" }]))
    ).toEqual({});
    expect(fieldErrorsFromError(new ApiError({ status: 400, message: "x" }))).toEqual({});
    expect(fieldErrorsFromError(new Error("x"))).toEqual({});
  });
});

describe("problemErrorsFromBatchError", () => {
  it("maps each failing item index to the problem number sent there", () => {
    const errors = problemErrorsFromBatchError(
      unprocessable([
        {
          loc: ["body", "items", 1],
          msg: "Value error, attempts_to_top is required when got_top is true",
          type: "value_error",
        },
        {
          loc: ["body", "items", 2, "attempts_total"],
          msg: "too small",
          type: "greater_than_equal",
        },
      ]),
      [4, 7, 9]
    );
    expect(errors).toEqual({
      7: "Ange antal försök till topp när toppen är tagen.",
      9: "Kontrollera uppgifterna och försök igen.",
    });
  });

  it("returns nothing for issues without an item index or non-422 errors", () => {
    expect(
      problemErrorsFromBatchError(unprocessable([{ loc: ["body"], msg: "x", type: null }]), [1])
    ).toEqual({});
    expect(problemErrorsFromBatchError(new ApiError({ status: 500, message: "x" }), [1])).toEqual(
      {}
    );
  });
});

describe("formatProblemList", () => {
  it("joins numbers in Swedish", () => {
    expect(formatProblemList([3])).toBe("problem 3");
    expect(formatProblemList([3, 5, 7])).toBe("problem 3, 5 och 7");
  });
});
