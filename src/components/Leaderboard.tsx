import { useState, useEffect, useMemo } from "react";
import { LevelLeaderboard } from "@/types";
import { getLeaderboard } from "@/services/api";
import { Spinner } from "@radix-ui/themes";
import CalloutMessage from "./user_feedback/CalloutMessage";
import { Trophy, Medal, Award } from "lucide-react";

const DEFAULT_GRADE_COLOR = "#D1D5DB";
const gradeColors: Record<number, string> = {
  1: "#C084FC",
  2: "#F9A8D4",
  3: "#FDBA74",
  4: "#FACC15",
  5: "#4ADE80",
  6: "#FFFFFF",
  7: "#000000",
};

interface LeaderboardProps {
  competitionId: number;
  level: number;
}

export function Leaderboard({ competitionId, level }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LevelLeaderboard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getLeaderboard(competitionId, level);
        setLeaderboard(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunde inte hämta topplistan.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [competitionId, level]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center font-bold">{rank}</span>;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 border-yellow-200";
      case 2:
        return "bg-gray-50 border-gray-200";
      case 3:
        return "bg-amber-50 border-amber-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  const gradeColor = useMemo(() => {
    return gradeColors[level] ?? DEFAULT_GRADE_COLOR;
  }, [level]);

  const gradeLabel = `Gradnivå: ${level}`;

  const containerClass = "flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md";
  const headerClass = "text-xl font-semibold mb-4 text-gray-800 flex items-center";

  if (loading) {
    return (
      <div className={containerClass}>
        <h3 className={headerClass}>
          Topplista - Nivå {level}
          <span
            className="w-5 h-5 rounded-full border border-gray-300 ml-2"
            style={{ backgroundColor: gradeColor }}
            title={gradeLabel}
          />
        </h3>
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar topplista...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClass}>
        <h3 className={headerClass}>
          Topplista - Nivå {level}
          <span
            className="w-5 h-5 rounded-full border border-gray-300 ml-2"
            style={{ backgroundColor: gradeColor }}
            title={gradeLabel}
          />
        </h3>
        <CalloutMessage message={error} color="red" />
      </div>
    );
  }

  if (!leaderboard || leaderboard.entries.length === 0) {
    return (
      <div className={containerClass}>
        <h3 className={headerClass}>
          Topplista - Nivå {level}
          <span
            className="w-5 h-5 rounded-full border border-gray-300 ml-2"
            style={{ backgroundColor: gradeColor }}
            title={gradeLabel}
          />
        </h3>
        <p className="text-center text-gray-500 py-4">Inga resultat ännu för denna nivå.</p>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <h3 className={headerClass}>
        <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
        Topplista - Nivå {level}
        <span
          className="w-5 h-5 rounded-full border border-gray-300 ml-2"
          style={{ backgroundColor: gradeColor }}
          title={gradeLabel}
        />
      </h3>

      <div className="space-y-2">
        {leaderboard.entries.map((entry) => (
          <div
            key={entry.climber_id}
            className={`flex items-center justify-between p-3 rounded-lg border-2 ${getRankBgColor(entry.rank)}`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{entry.climber_name}</p>
                <p className="text-xs text-gray-600">
                  {entry.tops} toppar • {entry.bonuses} bonus • {entry.total_score.toFixed(1)}{" "}
                  poäng
                </p>
              </div>
            </div>

            <div className="text-right text-sm text-gray-600">
              <p className="font-medium">{entry.total_score.toFixed(1)} p</p>
              <p className="text-xs">
                {entry.attempts_to_top > 0 ? `${entry.attempts_to_top} försök` : "-"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-gray-700">
          <strong>Poängberäkning:</strong> Baserat på IFSC-regler. Totala poäng, antal toppar,
          försök till topp, antal bonus, och försök till bonus.
        </p>
      </div>
    </div>
  );
}
