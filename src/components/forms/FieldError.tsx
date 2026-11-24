import { CircleAlert } from "lucide-react";
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
      className={cn(
        "mt-1 flex items-start gap-1.5 text-xs font-medium leading-snug text-red-700 dark:text-red-400",
        !message && "sr-only"
      )}
    >
      {message && (
        <span key={message} className="field-error-in flex items-start gap-1.5">
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </span>
      )}
    </p>
  );
}
