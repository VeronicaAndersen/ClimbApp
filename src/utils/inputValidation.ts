// ----------------------------------------------------------
// Client-side copies of the API's input rules, for early feedback.
// The API still validates everything; keep these in step with
// ClimbAPI schema/auth.py and schema/climber.py.
//
// Each validator returns a Swedish message, or null when the value is fine.
// Empty values return null: forms handle "required" themselves.
// ----------------------------------------------------------

export const USERNAME_MAX_LENGTH = 200;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 1024;

/** Unicode control characters (category Cc), e.g. NUL or tab. */
const CONTROL_CHARACTER = /\p{Cc}/u;
/** Control, invisible formatting (zero-width, bidi overrides) and lone surrogates. */
const FORBIDDEN_USERNAME_CHARACTER = /[\p{Cc}\p{Cf}\p{Cs}]/u;

/** The form the API stores and matches usernames in: trimmed and lowercased. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Length in code points, which is how the API counts. */
function lengthOf(value: string): number {
  return [...value].length;
}

export function containsControlCharacters(value: string): boolean {
  return CONTROL_CHARACTER.test(value);
}

export function validateUsername(value: string): string | null {
  if (value === "") return null;

  const normalized = normalizeUsername(value);
  if (normalized === "") return "Användarnamnet får inte bara innehålla mellanslag.";
  // Checked after normalizing, like the API: lowercasing can lengthen a name.
  if (lengthOf(normalized) > USERNAME_MAX_LENGTH) {
    return `Användarnamnet får vara högst ${USERNAME_MAX_LENGTH} tecken.`;
  }
  if (FORBIDDEN_USERNAME_CHARACTER.test(normalized)) {
    return "Användarnamnet får inte innehålla kontrolltecken eller osynliga tecken.";
  }
  return null;
}

export type PasswordRules = {
  /** Enforce the minimum length (signup and reset), not at login. */
  requireMinLength: boolean;
};

export function validatePassword(
  value: string,
  { requireMinLength }: PasswordRules
): string | null {
  if (value === "") return null;

  const length = lengthOf(value);
  if (length > PASSWORD_MAX_LENGTH) {
    return `Lösenordet får vara högst ${PASSWORD_MAX_LENGTH} tecken.`;
  }
  if (requireMinLength && length < PASSWORD_MIN_LENGTH) {
    return `Lösenordet måste innehålla minst ${PASSWORD_MIN_LENGTH} tecken.`;
  }
  return null;
}

/** For email, first name, last name and club. `label` starts the message, e.g. "E-post". */
export function validateTextField(value: string, label: string): string | null {
  if (containsControlCharacters(value)) return `${label} får inte innehålla kontrolltecken.`;
  return null;
}
