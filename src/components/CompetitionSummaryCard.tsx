import { Trophy, Star, Target, Medal, Calendar } from "lucide-react";
import { CompetitionWithScores } from "@/hooks/useUserCompetitions";

interface CompetitionSummaryCardProps {
  competitionData: CompetitionWithScores;
}

const gradeColors: Record<number, string> = {
  1: "#C084FC",
  2: "#F9A8D4",
  3: "#FDBA74",
  4: "#FACC15",
  5: "#4ADE80",
  6: "#FFFFFF",
  7: "#000000",
};

export default function CompetitionSummaryCard({ competitionData }: CompetitionSummaryCardProps) {
  const { competition, level, summary } = competitionData;

  const gradeColor = gradeColors[level] ?? "#D1D5DB";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{competition.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(competition.comp_date)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: gradeColor }}
            title={`Gradnivå: ${level}`}
          />
          <span className="text-sm font-medium text-gray-700">Nivå {level}</span>
        </div>
      </div>

      {/* Description */}
      {competition.description && (
        <p className="text-sm text-gray-600 mb-4">{competition.description}</p>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-600 font-medium">Toppar</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-amber-600">{summary.problemsWithTop}</span>
            <span className="text-sm text-gray-500">/ {summary.totalProblems}</span>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600 font-medium">Bonusar</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-green-600">{summary.problemsWithBonus}</span>
            <span className="text-sm text-gray-500">/ {summary.totalProblems}</span>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600 font-medium">Totalt försök</span>
          </div>
          <span className="text-xl font-bold text-blue-600">{summary.totalAttempts}</span>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <Medal className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600 font-medium">Snitt försök</span>
          </div>
          <span className="text-xl font-bold text-purple-600">{summary.averageAttempts}</span>
        </div>
      </div>
    </div>
  );
}
