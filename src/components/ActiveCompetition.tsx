import CalloutMessage from "./feedback/CalloutMessage";
import CompetitionScores from "./CompetitionScores";
import { SessionSwitcher } from "./SessionSwitcher";
import Loader from "@/components/feedback/Loader";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import { useActiveCompetition } from "@/hooks/useActiveCompetition";

const ERROR_MESSAGE = "Ett fel uppstod vid hämtning av aktiv tävling.";

// Switching session resets every query (storeTokens), so both hooks refetch
// for the new climber without SessionSwitcher having to trigger it.
const noop = () => {};

interface ActiveCompetitionProps {
  onHasChangesChange?: (hasChanges: boolean) => void;
}

export function ActiveCompetition({ onHasChangesChange }: ActiveCompetitionProps) {
  const { userInfo, messageInfo: userInfoError, loading: userLoading } = useGetUserInfo();
  const { activeCompetition: found, loading: compLoading, failed } = useActiveCompetition();

  // Like `failed`, a failed refetch of cached user info is not an error here.
  const hasError = failed || (userInfoError !== null && userInfo === null);
  const activeCompetition = hasError ? null : found;
  const userScope = userInfo?.user_scope ?? "";
  const currentUserName = userInfo?.username ?? "";

  if (userLoading || compLoading) {
    return (
      <div className="flex flex-col bg-card/90 backdrop-blur p-4 rounded-lg shadow-soft">
        <h2 className="text-2xl font-semibold text-center mb-4">Aktiv Tävling</h2>
        <div className="flex items-center justify-center py-8">
          <Loader label="Hämtar aktiv tävling" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-card/90 backdrop-blur p-4 rounded-lg shadow-soft">
      <div className="flex items-center justify-center gap-2 mb-4">
        <h2 className="text-2xl font-semibold text-center">Aktiv Tävling</h2>
      </div>

      <SessionSwitcher onSwitch={noop} />

      {hasError && <CalloutMessage message={ERROR_MESSAGE} color="red" />}

      {!activeCompetition ? (
        <div>
          <p className="text-center text-muted-foreground">
            Just nu har du inga aktiva tävlingar. Om du har anmält dig och betalat tävlingen kommer
            du att bli godkänd på tävlingsdagen.
          </p>
          <p className="text-center text-muted-foreground">
            Kontakta receptionen för mer information.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-4 border border-border rounded-lg bg-card shadow-sm">
            <h3 className="text-xl font-semibold mb-2">{activeCompetition.name}</h3>

            <p className="text-muted-foreground mb-1">
              <strong>Datum:</strong> {activeCompetition.comp_date}
            </p>

            {activeCompetition.description && (
              <p className="text-muted-foreground mb-1">
                <strong>Beskrivning:</strong> {activeCompetition.description}
              </p>
            )}
          </div>

          <CompetitionScores
            competitionId={activeCompetition.id}
            competitionDate={activeCompetition.comp_date}
            userScope={userScope}
            viewingClimberName={currentUserName}
            onHasChangesChange={onHasChangesChange}
          />
        </>
      )}
    </div>
  );
}
