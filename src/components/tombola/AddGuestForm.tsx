import { useId, type FormEvent } from "react";
import { Button } from "@radix-ui/themes";
import { ChevronDown, UserPlus } from "lucide-react";
import { GUEST_NAME_MAX_LENGTH } from "@/utils/tombola";

interface AddGuestFormProps {
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSpinning: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

/** Adds a person to the draw on this device only. Can be collapsed to save space. */
export function AddGuestForm({
  name,
  onNameChange,
  onSubmit,
  isSpinning,
  isOpen,
  onToggle,
}: AddGuestFormProps) {
  const contentId = useId();
  const inputId = useId();

  return (
    <div className="bg-card rounded-2xl shadow-soft mb-6 border border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-2 p-5 text-sm font-semibold text-muted-foreground uppercase tracking-wide rounded-2xl cursor-pointer transition-colors duration-100 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        Lägg till person
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-300 ease-apple ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <form id={contentId} onSubmit={onSubmit} hidden={!isOpen} className="px-5 pb-5">
        <label htmlFor={inputId} className="sr-only">
          Namn
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={GUEST_NAME_MAX_LENGTH}
            placeholder="Namn"
            autoComplete="off"
            className="input-base p-2.5 flex-1 min-w-0"
          />
          <Button
            type="submit"
            disabled={!name.trim() || isSpinning}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Lägg till
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Sparas bara på den här enheten, inte i databasen.
        </p>
      </form>
    </div>
  );
}
