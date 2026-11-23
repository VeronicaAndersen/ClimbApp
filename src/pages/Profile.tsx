import { useAuthStore } from "@/store/auth";
import { clearTokens, isLoggedIn } from "@/lib/apiClient";
import { useSessionsStore } from "@/store/sessions";
import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Spinner } from "@radix-ui/themes/components/index";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import { AppHeader } from "@/components/AppHeader";
import CalloutMessage from "@/components/feedback/CalloutMessage";
import ProfilInfo from "@/components/ProfilInfo";
import { AssignToCompetitionsList } from "@/components/AssignToCompetitionsList";
import { CompleteProfileForm } from "@/components/forms/CompleteProfileForm";
import { SessionSwitcher } from "@/components/SessionSwitcher";
import { ProfileBottomNav, ProfileMenubar, type NavigationView } from "@/components/ProfileNav";
import { ADMIN_VIEWS } from "@/constants/profileMenu";
import { getCompetitions } from "@/services/api";
import { CompetitionResponse } from "@/types";
import { getGradeColor } from "@/constants/gradeColors";

const ActiveCompetition = lazy(() =>
  import("@/components/ActiveCompetition").then((m) => ({ default: m.ActiveCompetition }))
);
const SeasonForm = lazy(() =>
  import("@/components/admin/forms/SeasonForm").then((m) => ({ default: m.SeasonForm }))
);
const CompetitionForm = lazy(() =>
  import("@/components/admin/forms/CompetitionForm").then((m) => ({ default: m.CompetitionForm }))
);
const CompetitionList = lazy(() =>
  import("@/components/admin/CompetitionList").then((m) => ({ default: m.CompetitionList }))
);
const SeasonList = lazy(() =>
  import("@/components/admin/SeasonList").then((m) => ({ default: m.SeasonList }))
);
const ClimberList = lazy(() =>
  import("@/components/admin/ClimberList").then((m) => ({ default: m.ClimberList }))
);
const Leaderboard = lazy(() =>
  import("@/components/admin/Leaderboard").then((m) => ({ default: m.Leaderboard }))
);
const CompetitionListSection = lazy(() =>
  import("@/components/admin/CompetitionListSection").then((m) => ({
    default: m.CompetitionListSection,
  }))
);
const ProblemStatsTable = lazy(() =>
  import("@/components/admin/ProblemStatsTable").then((m) => ({ default: m.ProblemStatsTable }))
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-8">
    <Spinner size="3" />
    <span className="ml-2">Laddar...</span>
  </div>
);

export default function Profile() {
  const { setToken } = useAuthStore();
  const { clearSessions, sessions } = useSessionsStore();
  const navigate = useNavigate();
  const [seasonRefreshKey, setSeasonRefreshKey] = useState(0);
  const [competitionRefreshKey, setCompetitionRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<NavigationView>(() => {
    const saved = sessionStorage.getItem("profile_view") as NavigationView | null;
    return saved ?? "active_competition";
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { userInfo, messageInfo, loading: userLoading, refetch } = useGetUserInfo();

  const isAdmin = userInfo?.user_scope === "admin";
  const [selectedCompForStats, setSelectedCompForStats] = useState<number | null>(null);
  const [selectedLevelForStats, setSelectedLevelForStats] = useState<number | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionResponse[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const LEVELS = [1, 2, 3, 4, 5, 6, 7];

  // If a non-admin ended up on an admin-only view (e.g. after role change), fall back.
  useEffect(() => {
    if (!userLoading && !isAdmin && ADMIN_VIEWS.includes(activeView)) {
      setActiveView("active_competition");
    }
  }, [isAdmin, userLoading, activeView]);
  const isProfileIncomplete =
    userInfo && (!userInfo.email || !userInfo.firstname || !userInfo.lastname);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/");
    }
  }, [navigate]);

  // Reset unsaved-changes flag when leaving the score view
  useEffect(() => {
    if (activeView !== "active_competition") {
      setHasUnsavedChanges(false);
    }
  }, [activeView]);

  useEffect(() => {
    const fetchCompetitions = async () => {
      setCompetitionsLoading(true);
      try {
        const comps = await getCompetitions();
        setCompetitions(comps);
      } catch (err) {
        console.error("Failed to fetch competitions:", err);
      } finally {
        setCompetitionsLoading(false);
      }
    };
    fetchCompetitions();
  }, []);

  const handleNavigate = useCallback(
    (view: NavigationView | null, to?: string): boolean => {
      if (hasUnsavedChanges && activeView === "active_competition") {
        if (!window.confirm("Du har osparade ändringar. Vill du lämna sidan ändå?")) return false;
      }
      if (to) {
        navigate(to);
      } else if (view) {
        sessionStorage.setItem("profile_view", view);
        setActiveView(view);
      }
      return true;
    },
    [hasUnsavedChanges, activeView, navigate]
  );

  const handleLogout = () => {
    setToken(null);
    clearTokens();
    clearSessions();
    sessionStorage.removeItem("profile_view");
    navigate("/");
  };

  const renderActiveView = () => {
    if (ADMIN_VIEWS.includes(activeView) && !isAdmin) return null;

    switch (activeView) {
      case "competition":
        return <AssignToCompetitionsList />;
      case "active_competition":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ActiveCompetition onHasChangesChange={setHasUnsavedChanges} />
          </Suspense>
        );
      case "profile":
        return (
          <div>
            {sessions.length > 1 && (
              <div className="mb-4 p-4 bg-card/90 backdrop-blur rounded-lg shadow-soft">
                <SessionSwitcher onSwitch={refetch} />
              </div>
            )}
            <ProfilInfo />
          </div>
        );
      case "users":
        return (
          <div>
            <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">Hantera klättrare</h3>
            <Suspense fallback={<LoadingFallback />}>
              <ClimberList />
            </Suspense>
          </div>
        );
      case "leaderboard":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Leaderboard />
          </Suspense>
        );
      case "admin":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <div className="grid grid-cols-1 gap-2">
              <h3 className="text-xl font-semibold mb-2 text-foreground">Godkänn anmälda</h3>
              <CompetitionListSection refreshKey={competitionRefreshKey} />

              <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">
                Hantera säsonger och tävlingar
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <SeasonList refreshKey={seasonRefreshKey} />
                <CompetitionList refreshKey={competitionRefreshKey} />

                <SeasonForm onSeasonCreated={() => setSeasonRefreshKey((prev) => prev + 1)} />
                <CompetitionForm
                  onCompetitionCreated={() => setCompetitionRefreshKey((prev) => prev + 1)}
                />
              </div>
            </div>
          </Suspense>
        );
      case "statistics":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <div className="grid grid-cols-1 gap-2">
              <h3 className="text-xl font-semibold mb-2 text-foreground">Statistik</h3>
              <div className="mb-4 p-4 bg-card/90 backdrop-blur rounded-lg shadow-soft flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Tävling
                  </label>
                  {competitionsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground p-2.5">
                      <Spinner size="2" />
                      <span>Hämtar tävlingar...</span>
                    </div>
                  ) : competitions.length === 0 ? (
                    <p className="text-muted-foreground p-2.5">Inga tävlingar tillgängliga.</p>
                  ) : (
                    <select
                      value={selectedCompForStats ?? ""}
                      onChange={(e) =>
                        setSelectedCompForStats(e.target.value ? parseInt(e.target.value) : null)
                      }
                      className="w-full p-2.5 rounded-lg border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                    >
                      <option value="">Välj tävling...</option>
                      {competitions.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.comp_date})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedCompForStats !== null && (
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Nivå
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => setSelectedLevelForStats(level)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-medium ${
                            selectedLevelForStats === level
                              ? "shadow-soft"
                              : "border-border text-muted-foreground hover:border-foreground/40"
                          }`}
                          style={{
                            backgroundColor:
                              selectedLevelForStats === level
                                ? getGradeColor(level)
                                : "transparent",
                            color: selectedLevelForStats === level ? "white" : undefined,
                            borderColor:
                              selectedLevelForStats === level ? getGradeColor(level) : undefined,
                          }}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-foreground/25 shrink-0"
                            style={{ backgroundColor: getGradeColor(level) }}
                          />
                          Nivå {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedCompForStats !== null && selectedLevelForStats !== null ? (
                <ProblemStatsTable comp_id={selectedCompForStats} level={selectedLevelForStats} />
              ) : selectedCompForStats !== null ? (
                <p className="text-center text-muted-foreground bg-card/90 backdrop-blur rounded-lg shadow-soft py-6">
                  Välj en nivå ovan för att visa statistik.
                </p>
              ) : (
                !competitionsLoading &&
                competitions.length > 0 && (
                  <p className="text-center text-muted-foreground bg-card/90 backdrop-blur rounded-lg shadow-soft py-6">
                    Välj en tävling ovan för att visa statistik.
                  </p>
                )
              )}
            </div>
          </Suspense>
        );
      default:
        return null;
    }
  };

  const logoutButton = (
    <Button size="2" className="max-w-[45vw] cursor-pointer rounded-full" onClick={handleLogout}>
      <span className="truncate">Logga ut{userInfo?.username ? ` ${userInfo.username}` : ""}</span>
    </Button>
  );

  // Show loading state while fetching user info
  if (userLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <AppHeader />
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Laddar...</span>
        </div>
      </div>
    );
  }

  // Show profile completion form if required fields are missing
  if (isProfileIncomplete && userInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AppHeader actions={logoutButton} />
        <div className="surface flex flex-col items-center my-24 mx-4 p-6 max-w-md w-full">
          <h1 className="text-2xl font-semibold mb-2 text-center">
            Välkommen, {userInfo.username}!
          </h1>
          <CompleteProfileForm userInfo={userInfo} onComplete={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center">
      <AppHeader actions={logoutButton} />
      <div className="flex flex-col items-center mt-24 mb-20 md:my-24 mx-auto px-4 py-5 sm:p-6 rounded-3xl border border-border/60 bg-sage/30 dark:bg-card/40 backdrop-blur max-w-6xl w-[calc(100%-2rem)] overflow-y-auto">
        {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}

        {/* Navigation Menubar — desktop only */}
        <ProfileMenubar activeView={activeView} isAdmin={isAdmin} onNavigate={handleNavigate} />

        {/* Content Area */}
        <div className="w-full">{renderActiveView()}</div>
      </div>
      <ProfileBottomNav activeView={activeView} isAdmin={isAdmin} onNavigate={handleNavigate} />
    </div>
  );
}
