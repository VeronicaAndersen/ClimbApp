import { useCompetitions } from "@/hooks/useCompetitions";
import { CompetitionResponse } from "@/types";
import { Spinner } from "@radix-ui/themes";
import { ChevronRight, X } from "lucide-react";
import RegisterToCompForm from "./forms/RegisterToCompForm";
import CalloutMessage from "./feedback/CalloutMessage";
import { withdrawRegistration } from "@/services/api";
import { useState, useMemo } from "react";
import { sortCompetitions } from "@/utils/competitionSort";
import { SessionSwitcher } from "./SessionSwitcher";
import { getGradeColor, LEVEL_NAMES } from "@/constants/gradeColors";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { isToday } from "@/utils/competitionUtils";
import Loader from "@/components/feedback/Loader";

/** Day and short month of a "YYYY-MM-DD" date, parsed as local time so the day cannot shift. */
const formatDateTile = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return {
    day: date.getDate(),
    month: date.toLocaleDateString("sv-SE", { month: "short" }).replace(".", ""),
  };
};

export function AssignToCompetitionsList() {
  const {
    competitions: competitionList,
    loading,
    error,
    registrationStatus,
    registrations: registrationDetails,
    checkingRegistration,
    refreshRegistrationStatus,
    refetch,
  } = useCompetitions();

  const [withdrawing, setWithdrawing] = useState<number | null>(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState<number | null>(null);
  const [withdrawError, setWithdrawError] = useState<{ id: number; message: string } | null>(null);

  const handleWithdraw = async (competitionId: number) => {
    setWithdrawing(competitionId);
    setWithdrawError(null);
    try {
      await withdrawRegistration(competitionId);
      setWithdrawConfirm(null);
      await refreshRegistrationStatus(competitionId);
    } catch (err) {
      setWithdrawError({ id: competitionId, message: getUserFriendlyError(err) });
    } finally {
      setWithdrawing(null);
    }
  };

  const { upcoming: upcomingCompetitions, past: pastCompetitions } = useMemo(
    () => sortCompetitions(competitionList),
    [competitionList]
  );

  const hasPendingRegistrations = competitionList.some(
    (comp) =>
      registrationStatus[comp.id] &&
      registrationDetails[comp.id] &&
      !registrationDetails[comp.id].approved
  );

  const renderRegistrationStatus = (comp: CompetitionResponse) => {
    const isChecking = checkingRegistration[comp.id];
    const isRegistered = registrationStatus[comp.id];
    const regDetails = registrationDetails[comp.id];

    if (isChecking) {
      return <Loader label="Kontrollerar registrering" size="sm" />;
    }

    if (isRegistered) {
      const levelName = regDetails?.level ? LEVEL_NAMES[regDetails.level] : null;
      const levelColor = regDetails?.level ? getGradeColor(regDetails.level) : null;

      const levelBadge = levelName && levelColor && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <span
            className="w-3 h-3 rounded-full border border-foreground/25 shrink-0"
            style={{ backgroundColor: levelColor }}
          />
          {levelName}
        </span>
      );

      return (
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {regDetails?.approved ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300">
                ✓ Registrerad och godkänd
              </span>
              {levelBadge}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  ⏳ Väntar på godkännande
                </span>
                {levelBadge}
              </div>
              {isToday(comp.comp_date) && (
                <p className="text-xs text-muted-foreground">Uppdateras automatiskt</p>
              )}

              {withdrawConfirm === comp.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Säker?</span>
                  <button
                    onClick={() => handleWithdraw(comp.id)}
                    disabled={withdrawing === comp.id}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    {withdrawing === comp.id ? <Spinner size="1" /> : "Ja, dra tillbaka"}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setWithdrawConfirm(null)}
                    disabled={withdrawing === comp.id}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    Avbryt
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setWithdrawConfirm(comp.id)}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  Dra tillbaka anmälan
                </button>
              )}

              {withdrawError?.id === comp.id && (
                <div className="w-full">
                  <CalloutMessage message={withdrawError.message} color="red" />
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <RegisterToCompForm
        {...comp}
        onRegistrationSuccess={() => refreshRegistrationStatus(comp.id)}
      />
    );
  };

  const renderCompetition = (comp: CompetitionResponse, isPast = false) => {
    const { day, month } = formatDateTile(comp.comp_date);
    return (
      <li
        key={comp.id}
        className={`flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between ${
          isPast ? "opacity-75" : ""
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <time
            dateTime={comp.comp_date}
            className="flex w-12 shrink-0 flex-col items-center rounded-md bg-muted py-1.5 leading-none"
          >
            <span className="text-lg font-semibold text-foreground">{day}</span>
            <span className="mt-0.5 text-xs uppercase text-muted-foreground">{month}</span>
          </time>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{comp.name}</h3>
            {comp.comp_type && (
              <p className="text-sm text-muted-foreground lowercase first-letter:uppercase">
                {comp.comp_type}
              </p>
            )}
          </div>
        </div>
        <div className="sm:shrink-0">{renderRegistrationStatus(comp)}</div>
      </li>
    );
  };

  const header = (
    <header>
      <h2 className="text-xl font-semibold">Tävlingar</h2>
      <p className="text-sm text-muted-foreground">Anmäl dig till kommande tävlingar.</p>
    </header>
  );

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-4">
        {header}
        <div className="flex items-center justify-center py-8">
          <Loader label="Hämtar tävlingar" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {header}
      <SessionSwitcher
        onSwitch={() => {
          refetch();
        }}
      />

      {error && <CalloutMessage message={error} color="red" />}

      {hasPendingRegistrations && (
        <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
          En eller flera anmälningar väntar på godkännande. Kontakta receptionen för att godkänna
          din registrering och betalning.
        </div>
      )}

      {competitionList.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center">Inga tävlingar tillgängliga.</p>
      ) : (
        <>
          {upcomingCompetitions.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {upcomingCompetitions.map((comp) => renderCompetition(comp))}
            </ul>
          ) : (
            <p className="text-muted-foreground py-6 text-center">Inga kommande tävlingar.</p>
          )}

          {pastCompetitions.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                Tidigare tävlingar ({pastCompetitions.length})
              </summary>
              <ul className="flex flex-col gap-3 mt-2">
                {pastCompetitions.map((comp) => renderCompetition(comp, true))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
