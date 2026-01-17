import { useAuthStore } from "@/store/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SeasonForm } from "@/components/forms/SeasonForm";
import { SeasonList } from "@/components/SeasonList";
import { CompetitionForm } from "@/components/forms/CompetitionForm";
import { ActiveCompetition } from "@/components/ActiveCompetition";
import { Button } from "@radix-ui/themes/components/index";
import * as Menubar from "@radix-ui/react-menubar";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import CalloutMessage from "@/components/user_feedback/CalloutMessage";
import ProfilInfo from "@/components/ProfilInfo";
import { AssignToCompetitionsList } from "@/components/AssignToCompetitionsList";
import { CompetitionList } from "@/components/CompetitionList";
import { ClimberList } from "@/components/ClimberList";
import { CompetitionRegistrations } from "@/components/CompetitionRegistrations";
import { useCompetitions } from "@/hooks/useCompetitions";

type NavigationView = "competition" | "active_competition" | "profile" | "users" | "admin";

export default function Profile() {
  const { setClimber, setToken } = useAuthStore();
  const navigate = useNavigate();
  const [seasonRefreshKey, setSeasonRefreshKey] = useState(0);
  const [competitionRefreshKey, setCompetitionRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<NavigationView>("active_competition");

  const { userInfo, messageInfo } = useGetUserInfo();
  const { competitions } = useCompetitions();

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

  return (
    <div className="h-fit flex flex-col items-center justify-center">
      <img src="./grepp.svg" alt="grepp logo" className="w-28 absolute top-8 left-5" />
      <div className="flex flex-col items-center my-24 mx-4 p-4 shadow-md rounded-lg bg-[#c6d1b8]/80 backdrop-blur max-w-6xl w-full overflow-y-auto">
        {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}

        {/* Navigation Menubar */}
        <Menubar.Root className="w-full mb-6 flex justify-center bg-white rounded-md shadow-sm text-sm">
          <Menubar.Menu value="competition">
            <Menubar.Trigger
              onClick={() => setActiveView("competition")}
              className={`px-4 py-2 rounded cursor-pointer select-none outline-none transition-colors ${
                activeView === "competition"
                  ? "bg-[#505654] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Tävlingar
            </Menubar.Trigger>
          </Menubar.Menu>

          <Menubar.Menu value="active_competition">
            <Menubar.Trigger
              onClick={() => setActiveView("active_competition")}
              className={`px-2 py-1 rounded cursor-pointer select-none outline-none transition-colors ${
                activeView === "active_competition"
                  ? "bg-[#505654] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Aktiv Tävling
            </Menubar.Trigger>
          </Menubar.Menu>

          <Menubar.Menu value="profile">
            <Menubar.Trigger
              onClick={() => setActiveView("profile")}
              className={`px-4 py-2 rounded cursor-pointer select-none outline-none transition-colors ${
                activeView === "profile"
                  ? "bg-[#505654] text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Profil
            </Menubar.Trigger>
          </Menubar.Menu>
          {userInfo?.user_scope === "admin" && (
            <Menubar.Menu value="admin">
              <Menubar.Trigger
                onClick={() => setActiveView("admin")}
                className={`px-4 py-2 rounded cursor-pointer select-none outline-none transition-colors ${
                  activeView === "admin"
                    ? "bg-[#505654] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Klättrare
              </Menubar.Trigger>
            </Menubar.Menu>
          )}

          {userInfo?.user_scope === "admin" && (
            <Menubar.Menu value="admin">
              <Menubar.Trigger
                onClick={() => setActiveView("admin")}
                className={`px-4 py-2 rounded cursor-pointer select-none outline-none transition-colors ${
                  activeView === "admin"
                    ? "bg-[#505654] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Admin
              </Menubar.Trigger>
            </Menubar.Menu>
          )}
        </Menubar.Root>

        {/* Content Area */}
        <div className="w-full">
          {activeView === "competition" && <AssignToCompetitionsList />}

          {activeView === "active_competition" && <ActiveCompetition />}

          {activeView === "profile" && <ProfilInfo />}

          {activeView === "admin" && userInfo?.user_scope === "admin" && (
            <div>
              <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-800">Hantera klättrare</h3>
              <ClimberList />
            </div>
          )}

          {activeView === "admin" && userInfo?.user_scope === "admin" && (
            <div className="grid grid-cols-1 gap-2">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Godkänn anmälda</h3>
              {competitions && competitions.length > 0 ? (
                competitions.map((comp) => (
                  <CompetitionRegistrations key={comp.id} competition={comp} />
                ))
              ) : (
                <p className="text-gray-600 mb-4">Inga tävlingar tillgängliga.</p>
              )}

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
        className="absolute cursor-pointer bg-[#505654] hover:bg-[#868f79] rounded-full px-4 py-2 mt-4 text-white top-4 right-4"
        onClick={handleLogout}
      >
        Logga ut {userInfo?.name}
      </Button>
    </div>
  );
}
