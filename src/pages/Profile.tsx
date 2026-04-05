import { useAuthStore } from "@/store/auth";
import { clearTokens, isLoggedIn } from "@/lib/apiClient";
import { useSessionsStore } from "@/store/sessions";
import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Spinner } from "@radix-ui/themes/components/index";
import * as Menubar from "@radix-ui/react-menubar";
import {
  CalendarDays,
  Zap,
  User,
  Users,
  Trophy,
  Dices,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import CalloutMessage from "@/components/feedback/CalloutMessage";
import ProfilInfo from "@/components/ProfilInfo";
import { AssignToCompetitionsList } from "@/components/AssignToCompetitionsList";
import { CompleteProfileForm } from "@/components/forms/CompleteProfileForm";
import { SessionSwitcher } from "@/components/SessionSwitcher";

const ActiveCompetition = lazy(() =>
  import("@/components/ActiveCompetition").then((m) => ({ default: m.ActiveCompetition }))
);
const SeasonForm = lazy(() =>
  import("@/components/forms/admins/SeasonForm").then((m) => ({ default: m.SeasonForm }))
);
const CompetitionForm = lazy(() =>
  import("@/components/forms/admins/CompetitionForm").then((m) => ({ default: m.CompetitionForm }))
);
const CompetitionList = lazy(() =>
  import("@/components/admins/CompetitionList").then((m) => ({ default: m.CompetitionList }))
);
const SeasonList = lazy(() =>
  import("@/components/admins/SeasonList").then((m) => ({ default: m.SeasonList }))
);
const ClimberList = lazy(() =>
  import("@/components/admins/ClimberList").then((m) => ({ default: m.ClimberList }))
);
const Leaderboard = lazy(() =>
  import("@/components/admins/Leaderboard").then((m) => ({ default: m.Leaderboard }))
);
const CompetitionListSection = lazy(() =>
  import("@/components/CompetitionListSection").then((m) => ({ default: m.CompetitionListSection }))
);

type NavigationView =
  | "competition"
  | "active_competition"
  | "profile"
  | "users"
  | "admin"
  | "leaderboard";

const MENU_ITEMS = [
  {
    value: "competition" as const,
    label: "Anmälan",
    mobileLabel: "Anmälan",
    requiresAdmin: false,
    icon: CalendarDays,
  },
  {
    value: "active_competition" as const,
    label: "Mina poäng",
    mobileLabel: "Poäng",
    requiresAdmin: false,
    icon: Zap,
  },
  {
    value: "profile" as const,
    label: "Profil",
    mobileLabel: "Profil",
    requiresAdmin: false,
    icon: User,
  },
  {
    value: "users" as const,
    label: "Klättrare",
    mobileLabel: "Klättrare",
    requiresAdmin: true,
    icon: Users,
  },
  {
    value: "leaderboard" as const,
    label: "Resultatlista",
    mobileLabel: "Resultat",
    requiresAdmin: true,
    icon: Trophy,
  },
  {
    value: "tombola" as const,
    label: "Tombola",
    mobileLabel: "Tombola",
    requiresAdmin: true,
    icon: Dices,
    to: "/tombola",
  },
  {
    value: "admin" as const,
    label: "Admin",
    mobileLabel: "Admin",
    requiresAdmin: true,
    icon: Settings,
  },
];

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
  const [activeView, setActiveView] = useState<NavigationView>("competition");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const { userInfo, messageInfo, loading: userLoading, refetch } = useGetUserInfo();

  const isAdmin = userInfo?.user_scope === "admin";
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
    (view: NavigationView | null, to?: string) => {
      if (hasUnsavedChanges && activeView === "active_competition") {
        if (!window.confirm("Du har osparade ändringar. Vill du lämna sidan ändå?")) return;
      }
      setMoreMenuOpen(false);
      if (to) {
        navigate(to);
      } else if (view) {
        setActiveView(view);
      }
    },
    [hasUnsavedChanges, activeView, navigate]
  );

  const handleLogout = () => {
    setToken(null);
    clearTokens();
    clearSessions();
    navigate("/");
  };

  const getMenuItemClass = (itemValue: NavigationView) =>
    `px-4 py-2 rounded cursor-pointer select-none outline-none transition-colors ${
      activeView === itemValue
        ? "bg-[--secondary-color] text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  // Show loading state while fetching user info
  if (userLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <img src="./grepp.svg" alt="grepp logo" className="w-28 absolute top-8 left-5" />
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
      <div className="h-fit flex flex-col items-center justify-center">
        <img src="./grepp.svg" alt="grepp logo" className="w-28 absolute top-8 left-5" />
        <div className="flex flex-col items-center my-24 mx-4 p-4 shadow-md rounded-lg bg-[--primary-color] backdrop-blur max-w-md w-full">
          <h1 className="text-2xl font-semibold mb-2 text-center">
            Välkommen, {userInfo.username}!
          </h1>
          <CompleteProfileForm userInfo={userInfo} onComplete={refetch} />
        </div>
        <Button
          className="absolute cursor-pointer bg-[--secondary-color] hover:bg-[--secondary-color-hover] rounded-full px-4 py-2 mt-4 text-white top-4 right-4"
          onClick={handleLogout}
        >
          Logga ut
        </Button>
      </div>
    );
  }

  return (
    <div className="h-fit flex flex-col items-center justify-center">
      <img src="./grepp.svg" alt="grepp logo" className="w-28 absolute top-8 left-5" />
      <div className="flex flex-col items-center mt-24 mb-20 md:my-24 mx-4 p-4 shadow-md rounded-lg bg-[--primary-color] backdrop-blur max-w-6xl w-full overflow-y-auto">
        {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}

        {/* Navigation Menubar — desktop only */}
        <Menubar.Root className="w-full mb-6 hidden md:flex justify-center bg-white rounded-md shadow-sm text-sm">
          {MENU_ITEMS.filter((item) => !item.requiresAdmin || isAdmin).map((item) => (
            <Menubar.Menu key={item.value} value={item.value}>
              <Menubar.Trigger
                onClick={() => handleNavigate(item.value as NavigationView, item.to)}
                className={getMenuItemClass(item.value as NavigationView)}
              >
                {item.label}
              </Menubar.Trigger>
            </Menubar.Menu>
          ))}
        </Menubar.Root>

        {/* Content Area */}
        <div className="w-full">
          {activeView === "competition" && <AssignToCompetitionsList />}

          {activeView === "active_competition" && (
            <Suspense fallback={<LoadingFallback />}>
              <ActiveCompetition onHasChangesChange={setHasUnsavedChanges} />
            </Suspense>
          )}

          {activeView === "profile" && (
            <div>
              {sessions.length > 1 && (
                <div className="mb-4 p-4 bg-white/90 backdrop-blur rounded-lg shadow-md">
                  <SessionSwitcher onSwitch={refetch} />
                </div>
              )}
              <ProfilInfo />
            </div>
          )}

          {activeView === "users" && isAdmin && (
            <div>
              <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-800">Hantera klättrare</h3>
              <Suspense fallback={<LoadingFallback />}>
                <ClimberList />
              </Suspense>
            </div>
          )}

          {activeView === "leaderboard" && isAdmin && (
            <Suspense fallback={<LoadingFallback />}>
              <Leaderboard />
            </Suspense>
          )}

          {activeView === "admin" && isAdmin && (
            <Suspense fallback={<LoadingFallback />}>
              <div className="grid grid-cols-1 gap-2">
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Godkänn anmälda</h3>
                <CompetitionListSection refreshKey={competitionRefreshKey} />

                <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-800">
                  Hantera säsonger och tävlingar
                </h3>
                <SeasonList refreshKey={seasonRefreshKey} />
                <CompetitionList refreshKey={competitionRefreshKey} />

                <SeasonForm onSeasonCreated={() => setSeasonRefreshKey((prev) => prev + 1)} />
                <CompetitionForm
                  onCompetitionCreated={() => setCompetitionRefreshKey((prev) => prev + 1)}
                />
              </div>
            </Suspense>
          )}
        </div>
      </div>
      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
        {/* Admin overflow panel */}
        {isAdmin && moreMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
            <div className="absolute bottom-16 right-0 z-50 bg-white border border-gray-200 rounded-tl-xl shadow-lg py-2 min-w-40">
              {MENU_ITEMS.filter((item) => item.requiresAdmin).map((item) => {
                const Icon = item.icon;
                const isActive = !item.to && activeView === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => handleNavigate(item.value as NavigationView, item.to)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-[--secondary-color] bg-gray-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.mobileLabel}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="flex justify-around items-stretch h-16">
          {MENU_ITEMS.filter((item) => !item.requiresAdmin).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.value;
            return (
              <button
                key={item.value}
                onClick={() => handleNavigate(item.value as NavigationView)}
                className={`flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors ${
                  isActive ? "text-[--secondary-color]" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.mobileLabel}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-[--secondary-color] transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            );
          })}

          {isAdmin && (
            <button
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              className={`flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors ${
                moreMenuOpen ||
                MENU_ITEMS.filter((i) => i.requiresAdmin).some(
                  (i) => !i.to && activeView === i.value
                )
                  ? "text-[--secondary-color]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span>Mer</span>
              <span
                className={`w-1.5 h-1.5 rounded-full bg-[--secondary-color] transition-opacity ${
                  MENU_ITEMS.filter((i) => i.requiresAdmin).some(
                    (i) => !i.to && activeView === i.value
                  )
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              />
            </button>
          )}
        </div>
      </nav>

      <Button
        className="absolute cursor-pointer bg-[--secondary-color] hover:bg-[--secondary-color-hover] rounded-full px-4 py-2 mt-4 text-white top-4 right-4"
        onClick={handleLogout}
      >
        Logga ut {userInfo?.username}
      </Button>
    </div>
  );
}
