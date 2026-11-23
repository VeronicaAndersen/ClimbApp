import { Sparkles, Trophy } from "lucide-react";
import { getGradeColor } from "@/constants/gradeColors";
import type { TombolaParticipant } from "@/utils/tombola";

interface WinnerDisplayProps {
  /** The name shown while spinning, or the latest winner. */
  winner: TombolaParticipant | null;
  isSpinning: boolean;
  winnerCount: number;
}

export function WinnerDisplay({ winner, isSpinning, winnerCount }: WinnerDisplayProps) {
  return (
    <div
      className={`bg-card rounded-2xl shadow-soft p-10 mb-6 min-h-[260px] flex flex-col items-center justify-center border-2 transition-all duration-300 ${
        winner && !isSpinning ? "border-yellow-400 shadow-soft" : "border-border"
      }`}
    >
      {winner ? (
        <div
          key={isSpinning ? "spinning" : `reveal-${winnerCount}`}
          className={`text-center transition-all duration-200 ${
            isSpinning ? "opacity-60 scale-95" : "opacity-100 scale-100"
          }`}
        >
          <Trophy
            className={`w-14 h-14 mx-auto mb-4 transition-colors duration-300 ${
              isSpinning ? "text-muted-foreground/40" : "text-yellow-400"
            }`}
          />
          <p
            className={`text-4xl md:text-5xl font-bold mb-3 transition-colors duration-300 ${
              isSpinning ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {winner.name}
          </p>
          {!isSpinning && (
            <div className="flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300 font-semibold px-4 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-500/30 text-sm">
                <Sparkles className="w-4 h-4" />
                Vinnare #{winnerCount}
              </span>
              {winner.level !== null && (
                <span
                  className="inline-block w-4 h-4 rounded-full border border-border mt-1"
                  style={{ backgroundColor: getGradeColor(winner.level) }}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-muted-foreground/40">
          <Trophy className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Tryck på "Dra vinnare" för att börja
          </p>
        </div>
      )}
    </div>
  );
}
