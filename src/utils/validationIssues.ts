// ----------------------------------------------------------
// Swedish messages for the API's 422 issues ({loc, msg, type}), so the
// English pydantic `msg` is never shown next to a field.
// ----------------------------------------------------------
import { fieldOf, isApiError } from "@/lib/apiError";
import {
  PASSWORD_TOO_LONG_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
  USERNAME_TOO_LONG_MESSAGE,
  personNameMessage,
  plainTextMessage,
} from "./inputValidation";

export type FieldErrors = Partial<Record<string, string>>;

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

/** One Swedish message per field (the first issue wins) from a 422 ApiError. */
export function fieldErrorsFromError(error: unknown): FieldErrors {
  if (!isApiError(error) || error.status !== 422) return {};
  const errors: FieldErrors = {};
  for (const issue of error.validationIssues) {
    const field = fieldOf(issue);
    if (field !== null && errors[field] === undefined) {
      errors[field] = messageFor(field, issue.type);
    }
  }
  return errors;
}
