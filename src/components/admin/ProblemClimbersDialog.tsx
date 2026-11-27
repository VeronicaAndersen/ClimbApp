import { Dialog } from "@radix-ui/themes";
import type { ProblemStats, StatsClimber } from "@/types";

export type ClimberListKind = "top" | "bonus";

const CLIMBER_LIST_KINDS = {
  top: { title: "Topp", lowercase: "topp" },
  bonus: { title: "Bonus", lowercase: "bonus" },
} as const satisfies Record<ClimberListKind, { title: string; lowercase: string }>;

export type ProblemClimbersDialogProps = {
  open: boolean;
  /** The problem whose climbers are shown; kept while the dialog closes. */
  problem: ProblemStats | null;
  kind: ClimberListKind;
  onClose: () => void;
};

const fullName = (climber: StatsClimber): string =>
  [climber.firstname, climber.lastname].filter(Boolean).join(" ");

export function ProblemClimbersDialog({
  open,
  problem,
  kind,
  onClose,
}: ProblemClimbersDialogProps) {
  const climbers = problem
    ? kind === "top"
      ? problem.got_top_climbers
      : problem.got_bonus_climbers
    : [];
  const { title, lowercase } = CLIMBER_LIST_KINDS[kind];

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content maxWidth="420px" aria-describedby={undefined}>
        <Dialog.Title>
          {problem ? `Problem ${problem.problem_no} – ${title} (${climbers.length})` : title}
        </Dialog.Title>

        {climbers.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">{`Ingen har klarat ${lowercase} ännu.`}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {climbers.map((climber) => {
              const name = fullName(climber);
              return (
                <li key={climber.id} className="flex items-baseline gap-2 py-2">
                  <span className="font-medium text-foreground">{name || climber.username}</span>
                  {name && (
                    <span className="text-sm text-muted-foreground">{climber.username}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
