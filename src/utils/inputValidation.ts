// ----------------------------------------------------------
// Client-side copies of the API's input rules, for early feedback.
// The API still validates everything; keep these in step with
// ClimbAPI schema/auth.py and schema/climber.py.
//
// The server's rule decides. \p{L}, \p{M}, NFKC and lowercasing depend on
// the Unicode version of the browser and of the server's Python, so a newer
// browser may accept a letter the server rejects. The server then answers
// 422, and the form shows that error on the field (useServerFieldErrors).
//
// Each validator returns a Swedish message, or null when the value is fine.
// Empty values return null: forms handle "required" themselves.
// ----------------------------------------------------------

export const USERNAME_MAX_LENGTH = 200;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 1024;

/** Control, invisible formatting (zero-width, bidi overrides) and lone surrogates. */
const FORBIDDEN_USERNAME_CHARACTER = /[\p{Cc}\p{Cf}\p{Cs}]/u;

/**
 * Python's str.isspace() set, which the API's str.strip() removes. Unlike
 * String.prototype.trim() it includes U+001C–U+001F and U+0085, and it does
 * not include U+FEFF (so a leading BOM is kept and then rejected as Cf,
 * exactly as the API does).
 */
const PYTHON_WHITESPACE =
  "\\t\\n\\v\\f\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const PYTHON_STRIP = new RegExp(`^[${PYTHON_WHITESPACE}]+|[${PYTHON_WHITESPACE}]+$`, "g");

/** Trim like Python's str.strip(). */
export function stripLikePython(value: string): string {
  return value.replace(PYTHON_STRIP, "");
}

/** The form the API stores and matches usernames in: stripped and lowercased. */
export function normalizeUsername(value: string): string {
  return stripLikePython(value).toLowerCase();
}

/** Length in code points, which is how the API counts. */
function lengthOf(value: string): number {
  return [...value].length;
}

export const USERNAME_BLANK_MESSAGE = "Användarnamnet får inte bara innehålla mellanslag.";
export const USERNAME_TOO_LONG_MESSAGE = `Användarnamnet får vara högst ${USERNAME_MAX_LENGTH} tecken.`;
export const USERNAME_HIDDEN_CHARACTERS_MESSAGE =
  "Användarnamnet får inte innehålla kontrolltecken eller osynliga tecken.";
export const PASSWORD_TOO_LONG_MESSAGE = `Lösenordet får vara högst ${PASSWORD_MAX_LENGTH} tecken.`;
export const PASSWORD_TOO_SHORT_MESSAGE = `Lösenordet måste innehålla minst ${PASSWORD_MIN_LENGTH} tecken.`;

export function validateUsername(value: string): string | null {
  if (value === "") return null;

  const normalized = normalizeUsername(value);
  if (normalized === "") return USERNAME_BLANK_MESSAGE;
  // Checked after normalizing, like the API: lowercasing can lengthen a name.
  if (lengthOf(normalized) > USERNAME_MAX_LENGTH) return USERNAME_TOO_LONG_MESSAGE;
  if (FORBIDDEN_USERNAME_CHARACTER.test(normalized)) return USERNAME_HIDDEN_CHARACTERS_MESSAGE;
  return null;
}

// ----------------------------------------------------------
// New usernames (signup and username changes) follow a stricter rule than
// the lenient one above, which login keeps so legacy names (with emoji,
// for example) still work. Mirrors the API's rule for new usernames.
// ----------------------------------------------------------

export const NEW_USERNAME_EMPTY_MESSAGE = "Användarnamnet får inte vara tomt.";
export const NEW_USERNAME_SPACES_MESSAGE =
  "Användarnamnet får inte börja eller sluta med mellanslag eller ha två mellanslag i rad.";
export const NEW_USERNAME_CHARACTERS_MESSAGE =
  "Användarnamn får bara innehålla bokstäver, siffror, mellanslag och . _ - @";
/** Same limit as the API: enough for real text, too few for "zalgo" names. */
export const MAX_MARKS_PER_LETTER = 3;
export const NEW_USERNAME_TOO_MANY_MARKS_MESSAGE = `Högst ${MAX_MARKS_PER_LETTER} accenttecken på en bokstav.`;

/** Default_Ignorable code points, rejected even when they are letters or marks. */
const DEFAULT_IGNORABLE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00ad, 0x00ad],
  [0x034f, 0x034f],
  [0x061c, 0x061c],
  [0x115f, 0x1160],
  [0x17b4, 0x17b5],
  [0x180b, 0x180f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x206f],
  [0x3164, 0x3164],
  [0xfe00, 0xfe0f],
  [0xfeff, 0xfeff],
  [0xffa0, 0xffa0],
  [0xfff0, 0xfff8],
  [0x1bca0, 0x1bca3],
  [0x1d173, 0x1d17a],
  [0xe0000, 0xe0fff],
];

function isDefaultIgnorable(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0;
  return DEFAULT_IGNORABLE_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);
}
const LETTER = /^\p{L}$/u;
const MARK = /^\p{M}$/u;
const DIGIT = /^\p{Nd}$/u;
const NEW_USERNAME_PUNCTUATION = new Set([".", "_", "-", "@", " "]);

/** The form a new username is stored in: stripped, NFKC-normalized, lowercased. */
export function normalizeNewUsername(value: string): string {
  return stripLikePython(value).normalize("NFKC").toLowerCase();
}

/**
 * Letters (Lm) that only stretch the line between letters and are nearly
 * invisible, so two names could look the same: ARABIC TATWEEL (U+0640) and
 * NKO LAJANYALAN (U+07FA).
 */
const STRETCHING_LETTERS = new Set(["\u0640", "\u07FA"]);

/** Character check for a normalized new username, in the API's order. */
function characterError(normalized: string): string | null {
  // True while the previous character is a letter, or a mark that follows one.
  let afterLetter = false;
  let marksInRow = 0;
  for (const char of normalized) {
    if (isDefaultIgnorable(char) || STRETCHING_LETTERS.has(char)) {
      return NEW_USERNAME_CHARACTERS_MESSAGE;
    }
    if (LETTER.test(char)) {
      afterLetter = true;
      marksInRow = 0;
    } else if (MARK.test(char)) {
      marksInRow += 1;
      if (!afterLetter) return NEW_USERNAME_CHARACTERS_MESSAGE;
      if (marksInRow > MAX_MARKS_PER_LETTER) return NEW_USERNAME_TOO_MANY_MARKS_MESSAGE;
    } else if (DIGIT.test(char) || NEW_USERNAME_PUNCTUATION.has(char)) {
      afterLetter = false;
    } else {
      return NEW_USERNAME_CHARACTERS_MESSAGE;
    }
  }
  return null;
}

/** Validate a username being created or changed. Empty input returns null. */
export function validateNewUsername(value: string): string | null {
  if (value === "") return null;

  const normalized = normalizeNewUsername(value);
  if (normalized === "") return NEW_USERNAME_EMPTY_MESSAGE;
  if (lengthOf(normalized) > USERNAME_MAX_LENGTH) return USERNAME_TOO_LONG_MESSAGE;
  // NFKC can turn a character into a space (e.g. "¨" into space + mark).
  if (normalized.startsWith(" ") || normalized.endsWith(" ") || normalized.includes("  ")) {
    return NEW_USERNAME_SPACES_MESSAGE;
  }
  return characterError(normalized);
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
  if (length > PASSWORD_MAX_LENGTH) return PASSWORD_TOO_LONG_MESSAGE;
  if (requireMinLength && length < PASSWORD_MIN_LENGTH) return PASSWORD_TOO_SHORT_MESSAGE;
  return null;
}

/** Control characters and lone surrogates: the API can't store either. */
const UNSTORABLE_CHARACTER = /[\p{Cc}\p{Cs}]/u;
/** Invisible format characters (zero-width, bidi controls, BOM, ...). */
const FORMAT_CHARACTER = /\p{Cf}/u;
/** Bidi embedding/override (U+202A–U+202E) and isolate (U+2066–U+2069) controls. */
const BIDI_CONTROL = /[\u202A-\u202E\u2066-\u2069]/u;

export const plainTextMessage = (label: string) =>
  `${label} får inte innehålla kontrolltecken eller osynliga tecken.`;
export const personNameMessage = (label: string) =>
  `${label} får inte innehålla kontrolltecken eller tecken som ändrar textriktningen.`;

/** For email and club: no control, surrogate or invisible format characters. */
export function validatePlainText(value: string, label: string): string | null {
  if (UNSTORABLE_CHARACTER.test(value) || FORMAT_CHARACTER.test(value)) {
    return plainTextMessage(label);
  }
  return null;
}

/**
 * For first and last names: no control or surrogate characters and no bidi
 * controls. Other format characters such as ZWJ/ZWNJ are allowed, as the API
 * does, since they occur in real names.
 */
export function validatePersonName(value: string, label: string): string | null {
  if (UNSTORABLE_CHARACTER.test(value) || BIDI_CONTROL.test(value)) {
    return personNameMessage(label);
  }
  return null;
}
