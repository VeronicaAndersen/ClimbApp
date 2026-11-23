import { useNavigate } from "react-router-dom";
import { Spinner } from "@radix-ui/themes";
import { Trophy, Users } from "lucide-react";
import CalloutMessage from "@/components/feedback/CalloutMessage";
import { AddGuestForm } from "@/components/tombola/AddGuestForm";
import { CompetitionSelector } from "@/components/tombola/CompetitionSelector";
import { RemainingParticipants } from "@/components/tombola/RemainingParticipants";
import { SpinButton } from "@/components/tombola/SpinButton";
import { TombolaHeader } from "@/components/tombola/TombolaHeader";
import { TombolaStats } from "@/components/tombola/TombolaStats";
import { WinnerDisplay } from "@/components/tombola/WinnerDisplay";
import { WinnersList } from "@/components/tombola/WinnersList";
import { useTombola } from "@/hooks/useTombola";

export default function Tombola() {
  const navigate = useNavigate();
  const t = useTombola();

  if (t.isLoading && t.competitions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="3" />
          <p className="text-lg text-muted-foreground font-medium">Laddar tävlingar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <TombolaHeader
          onBack={() => navigate("/profile")}
          onReset={t.resetTombola}
          canReset={t.winners.length > 0}
        />

        <CompetitionSelector
          competitions={t.competitions}
          selectedId={t.selectedCompetitionId}
          onSelect={t.setSelectedCompetitionId}
        />

        {t.error && <CalloutMessage message={t.error} color="red" />}

        {!t.selectedCompetitionId && !t.error && (
          <div className="bg-card rounded-2xl shadow-soft p-12 flex flex-col items-center justify-center border border-border text-center">
            <Trophy className="w-16 h-16 text-muted-foreground/40 mb-4" />
            <p className="text-lg text-muted-foreground font-medium">
              Välj en tävling ovan för att starta tombolan
            </p>
          </div>
        )}

        {t.selectedCompetitionId && (
          <>
            <TombolaStats
              total={t.allParticipants.length}
              remaining={t.remainingParticipants.length}
              winners={t.winners.length}
            />

            {!t.isLoading && (
              <AddGuestForm
                name={t.guestName}
                onNameChange={t.setGuestName}
                onSubmit={t.addGuest}
                isSpinning={t.isSpinning}
              />
            )}

            {t.isLoading ? (
              <div className="bg-card rounded-2xl shadow-soft p-12 flex flex-col items-center justify-center border border-border min-h-[280px]">
                <Spinner size="3" />
                <p className="mt-4 text-muted-foreground font-medium">Laddar deltagare...</p>
              </div>
            ) : t.allParticipants.length === 0 ? (
              <div className="bg-card rounded-2xl shadow-soft p-12 flex flex-col items-center justify-center border border-border min-h-[280px]">
                <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">
                  Inga godkända anmälningar för {t.selectedCompetition?.name}. Lägg till personer
                  ovan.
                </p>
              </div>
            ) : (
              <>
                <WinnerDisplay
                  winner={t.currentWinner}
                  isSpinning={t.isSpinning}
                  winnerCount={t.winners.length}
                />

                <SpinButton
                  onSpin={t.spinTombola}
                  isSpinning={t.isSpinning}
                  disabled={t.isSpinning || t.remainingParticipants.length === 0}
                />

                {t.winners.length > 0 && <WinnersList winners={t.winners} />}

                {t.remainingParticipants.length > 0 && (
                  <RemainingParticipants
                    participants={t.remainingParticipants}
                    isSpinning={t.isSpinning}
                    onRemoveGuest={t.removeGuest}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
