import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useSessionsStore, type ClimberSession } from "@/store/sessions";
import { loginClimber, getMyInfo } from "@/services/api";
import { getAccessToken, switchSession } from "@/lib/apiClient";

interface Props {
  onSwitch: () => void;
}

export function SessionSwitcher({ onSwitch }: Props) {
  const { sessions, activeId, addOrUpdateSession, removeSession, setActiveId } = useSessionsStore();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const bootstrapped = useRef(false);

  // Bootstrap: seed the sessions list on first mount.
  // - If sessions were persisted (localStorage), restore the active session's
  //   refresh token into sessionStorage in case the tab was closed/reopened.
  // - Otherwise, call getMyInfo() so a token refresh can happen if needed,
  //   then capture the (possibly refreshed) tokens for the initial user.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (sessions.length > 0 && activeId !== null) {
      if (!sessionStorage.getItem("refresh_token")) {
        const active = sessions.find((s) => s.id === activeId);
        if (active) switchSession(active.accessToken, active.refreshToken);
      }
      return;
    }

    getMyInfo().then((info) => {
      if (!info) return;
      const accessToken = getAccessToken();
      const refreshToken = sessionStorage.getItem("refresh_token");
      if (!accessToken || !refreshToken) return;

      const name =
        [info.firstname, info.lastname].filter(Boolean).join(" ").trim() || info.username;

      addOrUpdateSession({ id: info.id, name, accessToken, refreshToken });
      setActiveId(info.id);
    });
  }, [addOrUpdateSession, activeId, sessions, setActiveId]);

  const handleSwitch = (session: ClimberSession) => {
    if (session.id === activeId) return;
    switchSession(session.accessToken, session.refreshToken);
    setActiveId(session.id);
    onSwitch();
  };

  const handleRemove = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== id);
    if (id === activeId && remaining.length > 0) {
      const next = remaining[0];
      switchSession(next.accessToken, next.refreshToken);
      setActiveId(next.id);
      onSwitch();
    }
    removeSession(id);
  };

  const handleAddLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const data = await loginClimber({ username: username.trim().toLowerCase(), password });
      if (!data) throw new Error("Inloggning misslyckades");

      const info = await getMyInfo();
      if (!info) throw new Error("Kunde inte hämta klättrarinformation");

      const accessToken = getAccessToken()!;
      const refreshToken = sessionStorage.getItem("refresh_token")!;
      const name =
        [info.firstname, info.lastname].filter(Boolean).join(" ").trim() || info.username;

      addOrUpdateSession({ id: info.id, name, accessToken, refreshToken });
      setActiveId(info.id);
      setShowLogin(false);
      setUsername("");
      setPassword("");
      onSwitch();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Inloggning misslyckades");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 items-center">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSwitch(s)}
            className={`flex items-center gap-1.5 py-1 rounded-full text-sm font-medium transition-colors ${sessions.length > 1 ? "pl-3 pr-1" : "px-3"} ${
              s.id === activeId
                ? "bg-[--secondary-color] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s.name}
            {sessions.length > 1 && (
              <span
                onClick={(e) => handleRemove(e, s.id)}
                className={`ml-0.5 w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/15 transition-colors ${
                  s.id === activeId ? "text-white/80" : "text-gray-400"
                }`}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => setShowLogin((v) => !v)}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 transition-colors border border-dashed border-gray-300"
        >
          <Plus className="w-3.5 h-3.5" />
          Lägg till
        </button>
      </div>

      {showLogin && (
        <form
          onSubmit={handleAddLogin}
          className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
        >
          <p className="text-sm font-medium text-gray-700">Logga in som en annan klättrare</p>
          {loginError && <p className="text-xs text-red-500">{loginError}</p>}
          <input
            type="text"
            placeholder="Användarnamn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 text-base rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[--secondary-color]"
            required
          />
          <input
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 text-base rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[--secondary-color]"
            required
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loginLoading}
              className="flex-1 py-2 text-sm font-medium rounded-lg bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white disabled:opacity-50 transition-colors"
            >
              {loginLoading ? "Loggar in..." : "Logga in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLogin(false);
                setLoginError(null);
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
