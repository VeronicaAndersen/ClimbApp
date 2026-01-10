import { useScores } from "@/hooks/useScores";
import { Spinner } from "@radix-ui/themes";
import CalloutMessage from "./user_feedback/CalloutMessage";
import ScoreSummary from "./ScoreSummary";
import ScoreHistory from "./ScoreHistory";
import ProblemGrid from "./ProblemGrid";

interface CompetitionScoresProps {
  competitionId: number;
}

export default function CompetitionScores({ competitionId }: CompetitionScoresProps) {
  const { problems, initialProblems, gradeLevel, isLoading, error } = useScores(competitionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="3" />
        <span className="ml-2">Hämtar poäng...</span>
      </div>
    );
  }

  if (error) {
    return <CalloutMessage message={error} color="red" />;
  }

  return (
    <div className="space-y-6">
      <ScoreSummary problems={problems} gradeLevel={gradeLevel} />
      <ScoreHistory currentProblems={problems} initialProblems={initialProblems} />
      <ProblemGrid competitionId={competitionId} />
    </div>
  );
}
