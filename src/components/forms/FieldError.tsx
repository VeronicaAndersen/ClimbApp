import { cn } from "@/lib/utils";

export type FieldErrorProps = {
  /** Referenced by the input's `aria-describedby`. */
  id: string;
  message: string | null;
};

/**
 * Inline validation message under a form field. The container is always
 * rendered as a polite live region, so screen readers announce a message
 * when it appears; it takes no space while empty.
 */
export function FieldError({ id, message }: FieldErrorProps) {
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn("text-xs italic text-red-700 dark:text-red-400", !message && "sr-only")}
    >
      {message}
    </p>
  );
}
