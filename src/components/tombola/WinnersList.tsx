import { Trophy } from "lucide-react";
import { getGradeColor } from "@/constants/gradeColors";
import type { TombolaParticipant } from "@/utils/tombola";

interface WinnersListProps {
  winners: TombolaParticipant[];
}

export function WinnersList({ winners }: WinnersListProps) {
  return (
    <div className="bg-card rounded-2xl shadow-soft p-5 mb-4 border border-border">
      <h3 className="text-base font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        Vinnare ({winners.length})
      </h3>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {winners.map((winner, index) => (
          <div
            key={winner.key}
            className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-500/10 dark:to-amber-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/30"
          >
            <span className="w-8 h-8 shrink-0 bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{winner.name}</p>
              {winner.level !== null && (
                <span
                  className="inline-block w-3 h-3 rounded-full border border-border mt-0.5"
                  style={{ backgroundColor: getGradeColor(winner.level) }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
