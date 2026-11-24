import { useState } from "react";
import { updateRegistrationApproval, updateRegistrationLevel } from "@/services/api";
import { Spinner, Button } from "@radix-ui/themes";
import { Check, X, RefreshCw } from "lucide-react";
import CalloutMessage from "../feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { getGradeColor, LEVEL_NAMES } from "@/constants/gradeColors";
import { useRegistrations } from "@/hooks/useRegistrations";
import Loader from "@/components/feedback/Loader";

const LEVELS = [1, 2, 3, 4, 5, 6, 7];

const getLevelColor = (level: number): string => getGradeColor(level);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface RegistrationApprovalListProps {
  competitionId: number;
  refreshKey?: number;
}

export function RegistrationApprovalList({
  competitionId,
  refreshKey,
}: RegistrationApprovalListProps) {
  const { registrations, loading, fetching, error, refetch, applyChange } = useRegistrations(
    competitionId,
    refreshKey
  );
  // Kept apart from the fetch error, so the refetch after a failed change
  // does not wipe the message before the admin has seen it.
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [changingLevelId, setChangingLevelId] = useState<number | null>(null);

  const handleApprovalChange = async (userId: number, approved: boolean) => {
    setUpdatingId(userId);
    setActionError(null);

    try {
      await updateRegistrationApproval(competitionId, userId, approved);
      await applyChange(userId, { approved });
    } catch (err) {
      setActionError(getUserFriendlyError(err));
      // Refetch to restore the server's state; it reports failures itself.
      void refetch();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLevelChange = async (userId: number, newLevel: number) => {
    setChangingLevelId(userId);
    setActionError(null);

    try {
      await updateRegistrationLevel(competitionId, userId, newLevel);
      await applyChange(userId, { level: newLevel });
    } catch (err) {
      setActionError(getUserFriendlyError(err));
      // Refetch to restore the server's state; it reports failures itself.
      void refetch();
    } finally {
      setChangingLevelId(null);
    }
  };

  const handleRefresh = () => {
    setActionError(null);
    void refetch();
  };

  const shownError = actionError ?? error;

  return (
    <div className="mb-6 h-fit flex flex-col bg-card/90 backdrop-blur p-4 rounded-lg shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Anmälda</h2>
        <Button
          onClick={handleRefresh}
          disabled={fetching}
          aria-label="Uppdatera anmälda"
          className="bg-muted hover:bg-accent text-foreground px-3 py-1 rounded disabled:opacity-50 cursor-pointer"
          size="1"
        >
          {fetching ? <Spinner size="1" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {shownError && <CalloutMessage message={shownError} color="red" />}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader label="Hämtar anmälda" />
        </div>
      ) : registrations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-semibold text-muted-foreground">Id</th>
                <th className="text-left p-2 font-semibold text-muted-foreground">Klättrare</th>
                <th className="text-left p-2 font-semibold text-muted-foreground">Nivå</th>
                <th className="text-left p-2 font-semibold text-muted-foreground">Registrerad</th>
                <th className="text-center p-2 font-semibold text-muted-foreground">Status</th>
                <th className="text-center p-2 font-semibold text-muted-foreground">Åtgärd</th>
              </tr>
            </thead>

            <tbody>
              {registrations.map((reg) => {
                const isUpdating = updatingId === reg.user_id;
                const isChangingLevel = changingLevelId === reg.user_id;
                const isBusy = isUpdating || isChangingLevel;

                return (
                  <tr
                    key={`${reg.comp_id}-${reg.user_id}`}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="p-2 text-foreground">{reg.user_id}</td>
                    <td className="p-2 text-foreground">{reg.climber_name}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-6 h-6 rounded-full border-2 border-border"
                          style={{ backgroundColor: getLevelColor(reg.level) }}
                          title={`Nivå ${reg.level}`}
                        />
                        <select
                          value={reg.level}
                          onChange={(e) => handleLevelChange(reg.user_id, Number(e.target.value))}
                          disabled={isChangingLevel}
                          className="input-base min-w-28 p-2"
                        >
                          {LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {LEVEL_NAMES[level]}
                            </option>
                          ))}
                        </select>
                        {isChangingLevel && <Spinner size="1" />}
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground text-sm">
                      {formatDate(reg.created_at)}
                    </td>
                    <td className="p-2 text-center">
                      {reg.approved ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300">
                          <Check className="w-3 h-3 mr-1" />
                          Godkänd
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300">
                          Väntar
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        {reg.approved ? (
                          <Button
                            onClick={() => handleApprovalChange(reg.user_id, false)}
                            disabled={isBusy}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1 rounded disabled:opacity-50"
                            size="1"
                          >
                            {isUpdating ? <Spinner size="1" /> : <X className="w-4 h-4" />}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleApprovalChange(reg.user_id, true)}
                            disabled={isBusy}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                            size="1"
                          >
                            {isUpdating ? <Spinner size="1" /> : <Check className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">Inga anmälda för denna tävling.</p>
      )}
    </div>
  );
}
