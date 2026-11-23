import { Users, X } from "lucide-react";
import { getGradeColor } from "@/constants/gradeColors";
import type { TombolaParticipant } from "@/utils/tombola";

interface RemainingParticipantsProps {
  participants: TombolaParticipant[];
  isSpinning: boolean;
  onRemoveGuest: (key: string) => void;
}

/** Climbers show their level colour; guests get a remove button instead. */
export function RemainingParticipants({
  participants,
  isSpinning,
  onRemoveGuest,
}: RemainingParticipantsProps) {
  return (
    <div className="bg-card rounded-2xl shadow-soft p-5 border border-border">
      <h3 className="text-base font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        Kvarvarande ({participants.length})
      </h3>
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
        {participants.map((p) => (
          <span
            key={p.key}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted/50 border border-border rounded-full text-sm text-muted-foreground"
          >
            {p.name}
            {p.level !== null ? (
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-border shrink-0"
                style={{ backgroundColor: getGradeColor(p.level) }}
              />
            ) : (
              <button
                type="button"
                onClick={() => onRemoveGuest(p.key)}
                disabled={isSpinning}
                aria-label={`Ta bort ${p.name}`}
                className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
