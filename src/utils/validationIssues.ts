// ----------------------------------------------------------
// Swedish messages for the API's 422 issues ({loc, msg, type}), so the
// English pydantic `msg` is never shown in the UI. Used by ApiError to build
// its message, by forms for per-field errors and by getUserFriendlyError.
//
// Only a type is imported from apiError, so there is no import cycle.
// ----------------------------------------------------------
import type { ValidationIssue } from "@/lib/apiError";
import {
  PASSWORD_TOO_LONG_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
  USERNAME_TOO_LONG_MESSAGE,
  personNameMessage,
  plainTextMessage,
} from "./inputValidation";

export type FieldErrors = Partial<Record<string, string>>;

export const VALIDATION_FAILED_MESSAGE = "Kontrollera uppgifterna och försök igen.";

/**
 * Known API validation texts (scoring rules) and their Swedish versions. They
 * come from model validators, so they have no field; matched on the English
 * text, which ApiError keeps in validationIssues.
 */
const KNOWN_ISSUE_TEXTS: ReadonlyArray<readonly [patterns: string[], swedish: string]> = [
  [
    ["ifsc: top implies zone", "got_bonus must be true"],
    "Enligt IFSC-regler måste bonus uppnås innan topp. Sätt bonusvärde först.",
  ],
  [
    ["attempts_to_top must be >= attempts_to_bonus"],
    "Antal försök till topp kan inte vara färre än försök till bonus.",
  ],
  [
    ["attempts_to_bonus cannot exceed attempts_total"],
    "Försök till bonus kan inte överstiga totalt antal försök.",
  ],
  [
    ["attempts_to_top cannot exceed attempts_total"],
    "Försök till topp kan inte överstiga totalt antal försök.",
  ],
  [
    ["attempts_to_bonus is required when got_bonus is true"],
    "Ange antal försök till bonus när bonus är tagen.",
  ],
  [
    ["attempts_to_top is required when got_top is true"],
    "Ange antal försök till topp när toppen är tagen.",
  ],
];

/** Swedish text for a known API validation message, or null. */
export function translateKnownIssueText(text: string): string | null {
  const lower = text.toLowerCase();
  const match = KNOWN_ISSUE_TEXTS.find(([patterns]) => patterns.some((p) => lower.includes(p)));
  return match ? match[1] : null;
}

/** Name of the field a 422 issue is about, e.g. "username" for ["body", "username"]. */
export function fieldOf(issue: ValidationIssue): string | null {
  const last = issue.loc[issue.loc.length - 1];
  return typeof last === "string" && last !== "body" ? last : null;
}

const FIELD_LABELS: Record<string, string> = {
  username: "Användarnamn",
  password: "Lösenord",
  new_password: "Lösenord",
  email: "E-post",
  firstname: "Förnamn",
  lastname: "Efternamn",
  club: "Klubb",
};

function messageFor(field: string, type: string | null): string {
  const label = FIELD_LABELS[field] ?? "Fältet";
  const isPassword = field === "password" || field === "new_password";

  switch (type) {
    case "missing":
      return `${label} måste fyllas i.`;
    case "string_too_short":
      if (isPassword) return PASSWORD_TOO_SHORT_MESSAGE;
      return `${label} får inte vara tomt.`;
    case "string_too_long":
      if (isPassword) return PASSWORD_TOO_LONG_MESSAGE;
      if (field === "username") return USERNAME_TOO_LONG_MESSAGE;
      return `${label} är för långt.`;
    case "value_error":
      if (field === "email" || field === "club") return plainTextMessage(label);
      if (field === "firstname" || field === "lastname") return personNameMessage(label);
      if (field === "username") return "Användarnamnet är ogiltigt. Kontrollera längd och tecken.";
      return `${label} har ett ogiltigt värde.`;
    default:
      return `${label} har ett ogiltigt värde.`;
  }
}

/** One Swedish message per field (the first issue wins). */
export function fieldErrorsFromIssues(issues: readonly ValidationIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = fieldOf(issue);
    if (field !== null && errors[field] === undefined) {
      errors[field] = messageFor(field, issue.type);
    }
  }
  return errors;
}

/**
 * One Swedish sentence for a whole 422: known texts and per-field messages,
 * without duplicates, or VALIDATION_FAILED_MESSAGE when none apply.
 */
export function summarizeIssues(issues: readonly ValidationIssue[]): string {
  const messages = new Set<string>();
  for (const issue of issues) {
    const field = fieldOf(issue);
    const message =
      translateKnownIssueText(issue.msg) ?? (field !== null ? messageFor(field, issue.type) : null);
    if (message !== null) messages.add(message);
  }
  return messages.size > 0 ? [...messages].join(" ") : VALIDATION_FAILED_MESSAGE;
}

/** The issues of a 422 ApiError, or none. Checked structurally (no import cycle). */
function issuesOf422(error: unknown): readonly ValidationIssue[] {
  if (typeof error !== "object" || error === null) return [];
  const { status, validationIssues } = error as { status?: unknown; validationIssues?: unknown };
  return status === 422 && Array.isArray(validationIssues)
    ? (validationIssues as ValidationIssue[])
    : [];
}

/** One Swedish message per field from a 422 ApiError; {} for anything else. */
export function fieldErrorsFromError(error: unknown): FieldErrors {
  return fieldErrorsFromIssues(issuesOf422(error));
}

/**
 * Swedish messages per problem from a failed batch score save. A 422 names the
 * failing item by its index (loc ["body", "items", <index>, ...]); the index is
 * mapped back to the problem number that was sent at that position. Issues
 * without an item index are ignored.
 */
export function problemErrorsFromBatchError(
  error: unknown,
  sentProblemNos: readonly number[]
): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const issue of issuesOf422(error)) {
    const [root, list, index] = issue.loc;
    if (root !== "body" || list !== "items" || typeof index !== "number") continue;
    const problemNo = sentProblemNos[index];
    if (problemNo === undefined || errors[problemNo] !== undefined) continue;
    const field = fieldOf(issue);
    errors[problemNo] =
      translateKnownIssueText(issue.msg) ??
      (field !== null && FIELD_LABELS[field]
        ? messageFor(field, issue.type)
        : VALIDATION_FAILED_MESSAGE);
  }
  return errors;
}

/** "problem 3" or "problem 3, 5 och 7". */
export function formatProblemList(problemNos: readonly number[]): string {
  if (problemNos.length <= 1) return `problem ${problemNos.join("")}`;
  return `problem ${problemNos.slice(0, -1).join(", ")} och ${problemNos[problemNos.length - 1]}`;
}
