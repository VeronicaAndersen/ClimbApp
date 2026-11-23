import type { FormEvent } from "react";
import { Button } from "@radix-ui/themes";
import { UserPlus } from "lucide-react";
import { GUEST_NAME_MAX_LENGTH } from "@/utils/tombola";

interface AddGuestFormProps {
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSpinning: boolean;
}

/** Adds a person to the draw on this device only. */
export function AddGuestForm({ name, onNameChange, onSubmit, isSpinning }: AddGuestFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-card rounded-2xl shadow-soft p-5 mb-6 border border-border"
    >
      <label
        htmlFor="guest-name"
        className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide"
      >
        Lägg till person
      </label>
      <div className="flex gap-2">
        <input
          id="guest-name"
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
  );
}
