export type FieldErrorProps = {
  /** Referenced by the input's `aria-describedby`. */
  id: string;
  message: string | null;
};

/** Inline validation message under a form field. Renders nothing without a message. */
export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs italic text-red-700">
      {message}
    </p>
  );
}
