// ----------------------------------------------------------
// Typed API errors
//
// The message is always safe to show: it is a `detail` string the API sent,
// the `msg` texts of a 422, or a generic Swedish text. The raw response body
// is never used, so HTML from a proxy or a stack trace can't reach the UI.
// ----------------------------------------------------------

export const SERVER_ERROR_MESSAGE = "Ett serverfel uppstod. Försök igen senare.";
export const RATE_LIMIT_GENERIC_MESSAGE = "För många försök. Vänta en stund och försök igen.";

/** One entry of a 422 `detail` list; the API no longer sends `input` or `ctx`. */
export type ValidationIssue = {
  loc: (string | number)[];
  msg: string;
  type: string | null;
};

export type ApiErrorInit = {
  status: number;
  message: string;
  detail?: string | null;
  retryAfterSeconds?: number | null;
  validationIssues?: ValidationIssue[];
};

export class ApiError extends Error {
  readonly status: number;
  /** The API's `detail` when it is a string, else null. */
  readonly detail: string | null;
  /** Seconds from the `Retry-After` header, or null if missing or unreadable. */
  readonly retryAfterSeconds: number | null;
  readonly validationIssues: ValidationIssue[];

  constructor({
    status,
    message,
    detail = null,
    retryAfterSeconds = null,
    validationIssues = [],
  }: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
    this.validationIssues = validationIssues;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isRateLimitError(error: unknown): error is ApiError {
  return isApiError(error) && error.isRateLimited;
}

/**
 * Seconds to wait from a `Retry-After` header. The API sends whole seconds;
 * the HTTP-date form is accepted too in case a proxy rewrites it.
 * Returns null when the header is missing or can't be read.
 */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  if (value === null) return null;
  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }

  // HTTP-date, e.g. "Wed, 21 Oct 2026 07:28:00 GMT". Requiring "GMT" keeps
  // Date.parse from accepting junk such as "1.5" as a date.
  if (/GMT$/.test(trimmed)) {
    const at = Date.parse(trimmed);
    if (!Number.isNaN(at)) return Math.max(0, Math.ceil((at - now) / 1000));
  }

  return null;
}

/** "Too many attempts" text in Swedish, with the wait rounded up when known. */
export function formatRateLimitMessage(retryAfterSeconds: number | null): string {
  if (retryAfterSeconds === null || retryAfterSeconds <= 0) return RATE_LIMIT_GENERIC_MESSAGE;

  if (retryAfterSeconds < 60) {
    const unit = retryAfterSeconds === 1 ? "sekund" : "sekunder";
    return `För många försök. Försök igen om ${retryAfterSeconds} ${unit}.`;
  }

  const minutes = Math.ceil(retryAfterSeconds / 60);
  const unit = minutes === 1 ? "minut" : "minuter";
  return `För många försök. Försök igen om ungefär ${minutes} ${unit}.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toValidationIssue(value: unknown): ValidationIssue | null {
  if (!isRecord(value) || typeof value.msg !== "string") return null;
  const loc = Array.isArray(value.loc)
    ? value.loc.filter(
        (part): part is string | number => typeof part === "string" || typeof part === "number"
      )
    : [];
  return { loc, msg: value.msg, type: typeof value.type === "string" ? value.type : null };
}

/** The `detail` of a JSON error body, as a string or a list of 422 issues. */
function parseDetail(body: string): string | ValidationIssue[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null; // not JSON (e.g. an HTML error page): ignore it
  }
  if (!isRecord(parsed)) return null;

  const { detail } = parsed;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(toValidationIssue)
      .filter((issue): issue is ValidationIssue => issue !== null);
  }
  return null;
}

/** Name of the field a 422 issue is about, e.g. "username" for ["body", "username"]. */
export function fieldOf(issue: ValidationIssue): string | null {
  const last = issue.loc[issue.loc.length - 1];
  return typeof last === "string" && last !== "body" ? last : null;
}

/** Build an ApiError from a failed response. Reads the body; call once. */
export async function toApiError(response: Response): Promise<ApiError> {
  const { status } = response;
  const retryAfterSeconds =
    status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : null;

  if (status === 429) {
    return new ApiError({
      status,
      message: formatRateLimitMessage(retryAfterSeconds),
      retryAfterSeconds,
    });
  }

  if (status >= 500) {
    // 500 bodies are generic by design; don't even read them.
    return new ApiError({ status, message: SERVER_ERROR_MESSAGE });
  }

  const body = await response.text().catch(() => "");
  const detail = body ? parseDetail(body) : null;

  if (Array.isArray(detail)) {
    const messages = detail.map((issue) => issue.msg).filter(Boolean);
    return new ApiError({
      status,
      message: messages.length > 0 ? messages.join("; ") : `Fel: ${status}`,
      validationIssues: detail,
    });
  }

  return new ApiError({ status, message: detail || `Fel: ${status}`, detail });
}
