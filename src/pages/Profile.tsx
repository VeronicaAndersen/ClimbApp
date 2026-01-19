import { useAuthStore } from "@/store/auth";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Spinner } from "@radix-ui/themes/components/index";
import * as Menubar from "@radix-ui/react-menubar";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import CalloutMessage from "@/components/user_feedback/CalloutMessage";
import ProfilInfo from "@/components/ProfilInfo";
import { AssignToCompetitionsList } from "@/components/AssignToCompetitionsList";
import { useCompetitions } from "@/hooks/useCompetitions";
import { SeasonForm } from "@/components/forms/admins/SeasonForm";
import { CompetitionList } from "@/components/admins/CompetitionList";
import { CompetitionForm } from "@/components/forms/admins/CompetitionForm";
import { ClimberList } from "@/components/admins/ClimberList";
import { SeasonList } from "@/components/admins/SeasonList";
import { CompetitionListSection } from "@/components/CompetitionListSection";

// Lazy load ActiveCompetition component (the heaviest)
const ActiveCompetition = lazy(() =>
  import("@/components/ActiveCompetition").then((module) => ({ default: module.ActiveCompetition }))
);

type NavigationView = "competition" | "active_competition" | "profile" | "users" | "admin";

const MENU_ITEMS = [
  { value: "competition" as const, label: "Tävlingar", requiresAdmin: false },
  { value: "active_competition" as const, label: "Aktiv Tävling", requiresAdmin: false },
  { value: "profile" as const, label: "Profil", requiresAdmin: false },
  { value: "users" as const, label: "Klättrare", requiresAdmin: true },
  { value: "admin" as const, label: "Admin", requiresAdmin: true },
];

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-8">
    <Spinner size="3" />
    <span className="ml-2">Laddar...</span>
  </div>
);

export default function Profile() {
  const { setClimber, setToken } = useAuthStore();
  const navigate = useNavigate();
  const [seasonRefreshKey, setSeasonRefreshKey] = useState(0);
  const [competitionRefreshKey, setCompetitionRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<NavigationView>("active_competition");

  const { userInfo, messageInfo } = useGetUserInfo();
  const { competitions } = useCompetitions();

  const isAdmin = useMemo(() => userInfo?.user_scope === "admin", [userInfo?.user_scope]);

  useEffect(() => {
    const storedUser = localStorage.getItem("tokens");
    if (!storedUser) {
      navigate("/");
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (parsed) {
        setClimber(parsed);
      } else {
        console.error("Invalid user data in localStorage:", parsed);
        navigate("/");
      }
    } catch {
      console.error("Failed to parse user data from localStorage");
      navigate("/");
    }
  }, [navigate, setClimber]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("tokens");
    navigate("/");
  };

  const getMenuItemClass = (itemValue: NavigationView) =>
    `px-4 py-2 rounded cursor-pointer select-none outline-none transition-colors ${
      activeView === itemValue
        ? "bg-[--secondary-color] text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <div className="h-fit flex flex-col items-center justify-center">
      <img src="./grepp.svg" alt="grepp logo" className="w-28 absolute top-8 left-5" />
      <div className="flex flex-col items-center my-24 mx-4 p-4 shadow-md rounded-lg bg-[--primary-color] backdrop-blur max-w-6xl w-full overflow-y-auto">
        {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}

        {/* Navigation Menubar */}
        <Menubar.Root className="w-full mb-6 flex justify-center bg-white rounded-md shadow-sm text-sm">
          {MENU_ITEMS.filter((item) => !item.requiresAdmin || isAdmin).map((item) => (
            <Menubar.Menu key={item.value} value={item.value}>
              <Menubar.Trigger
                onClick={() => setActiveView(item.value)}
                className={getMenuItemClass(item.value)}
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
              <ActiveCompetition />
            </Suspense>
          )}

          {activeView === "profile" && <ProfilInfo />}

          {activeView === "users" && isAdmin && (
            <div>
              <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-800">Hantera klättrare</h3>
              <ClimberList />
            </div>
          )}

          {activeView === "admin" && isAdmin && (
            <div className="grid grid-cols-1 gap-2">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Godkänn anmälda</h3>
              <CompetitionListSection
                competitions={competitions || []}
                refreshKey={competitionRefreshKey}
              />

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
          )}
        </div>
      </div>
      <Button
        className="absolute cursor-pointer bg-[--secondary-color] hover:bg-[--secondary-color-hover] rounded-full px-4 py-2 mt-4 text-white top-4 right-4"
        onClick={handleLogout}
      >
        Logga ut {userInfo?.name}
      </Button>
    </div>
  );
}
