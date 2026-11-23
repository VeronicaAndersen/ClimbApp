import { useCallback, useState } from "react";
import { fieldErrorsFromError, type FieldErrors } from "@/utils/validationIssues";

type Snapshot<T> = { values: T; errors: FieldErrors };

/**
 * Field errors from a 422, shown next to the fields until the user edits
 * them. Each error is tied to the value that was submitted, so changing a
 * field hides its error without extra onChange wiring.
 */
export function useServerFieldErrors<T extends object>(values: T) {
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);

  const recordServerErrors = useCallback((error: unknown, submitted: T) => {
    const errors = fieldErrorsFromError(error);
    setSnapshot(Object.keys(errors).length > 0 ? { values: submitted, errors } : null);
  }, []);

  /** Forget recorded errors, e.g. after a successful submit. */
  const clearServerErrors = useCallback(() => setSnapshot(null), []);

  const serverErrorFor = (field: keyof T & string): string | null => {
    if (!snapshot || !Object.is(snapshot.values[field], values[field])) return null;
    return snapshot.errors[field] ?? null;
  };

  return { serverErrorFor, recordServerErrors, clearServerErrors };
}
