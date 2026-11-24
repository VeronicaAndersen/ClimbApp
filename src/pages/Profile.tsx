import { useAuthStore } from "@/store/auth";
import { clearTokens, isLoggedIn } from "@/lib/apiClient";
import { useSessionsStore } from "@/store/sessions";
import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@radix-ui/themes/components/index";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import { AppHeader } from "@/components/AppHeader";
import CalloutMessage from "@/components/feedback/CalloutMessage";
import ProfilInfo from "@/components/ProfilInfo";
import { AssignToCompetitionsList } from "@/components/AssignToCompetitionsList";
import { CompleteProfileForm } from "@/components/forms/CompleteProfileForm";
import { SessionSwitcher } from "@/components/SessionSwitcher";
import { ProfileBottomNav, ProfileMenubar, type NavigationView } from "@/components/ProfileNav";
import { ADMIN_VIEWS } from "@/constants/profileMenu";
import Loader from "@/components/feedback/Loader";

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
const StatisticsView = lazy(() =>
  import("@/components/admin/StatisticsView").then((m) => ({ default: m.StatisticsView }))
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-8">
    <Loader label="Laddar" />
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
              <div className="mb-4 p-4 rounded-2xl border border-border/50 bg-card shadow-soft">
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
            <StatisticsView />
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
          <Loader label="Laddar" />
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
      <div className="flex flex-col items-center mt-24 mb-20 md:my-24 mx-auto px-4 py-5 sm:p-6 material-thick rounded-[1.75rem] border border-border/50 max-w-6xl w-[calc(100%-2rem)] overflow-y-auto">
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
