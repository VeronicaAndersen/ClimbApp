import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useSessionsStore, type ClimberSession } from "@/store/sessions";
import { loginClimber, getMyInfo } from "@/services/api";
import { getAccessToken, switchSession } from "@/lib/apiClient";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { useCooldown } from "@/hooks/useCooldown";
import { cn } from "@/lib/utils";
import { normalizeUsername, validatePassword, validateUsername } from "@/utils/inputValidation";

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
  const { isCoolingDown, startCooldownFor } = useCooldown({
    onExpire: () => setLoginError(null),
  });
  const bootstrapped = useRef(false);
  // Focus returns here when the form closes, instead of dropping to <body>.
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const closeLogin = () => {
    setShowLogin(false);
    setLoginError(null);
    setPassword("");
    addButtonRef.current?.focus();
  };

  // Bootstrap: seed the sessions list on first mount.
  // - If sessions were persisted (sessionStorage) but the refresh token is
  //   gone, restore the active session's tokens.
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

  const handleRemove = (id: number) => {
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
    const validationError =
      validateUsername(username) ?? validatePassword(password, { requireMinLength: false });
    if (validationError) {
      setLoginError(validationError);
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const data = await loginClimber({ username: normalizeUsername(username), password });
      if (!data) throw new Error("Inloggning misslyckades");

      const info = await getMyInfo();
      if (!info) throw new Error("Kunde inte hämta klättrarinformation");

      const accessToken = getAccessToken()!;
      const refreshToken = sessionStorage.getItem("refresh_token")!;
      const name =
        [info.firstname, info.lastname].filter(Boolean).join(" ").trim() || info.username;

      addOrUpdateSession({ id: info.id, name, accessToken, refreshToken });
      setActiveId(info.id);
      setUsername("");
      closeLogin();
      onSwitch();
    } catch (err) {
      setLoginError(getUserFriendlyError(err));
      startCooldownFor(err);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 items-center">
        {sessions.map((s) => {
          const isActive = s.id === activeId;
          return (
            <div
              key={s.id}
              className={`flex items-center rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <button
                type="button"
                onClick={() => handleSwitch(s)}
                aria-current={isActive ? "true" : undefined}
                className={`pressable rounded-full py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  sessions.length > 1 ? "pl-3 pr-1" : "px-3"
                }`}
              >
                {s.name}
              </button>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemove(s.id)}
                  aria-label={`Ta bort ${s.name}`}
                  className={`pressable mr-1 flex h-5 w-5 items-center justify-center rounded-full outline-none transition-colors hover:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"
                  }`}
                >
                  <X className="w-3 h-3" aria-hidden />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          ref={addButtonRef}
          onClick={() => (showLogin ? closeLogin() : setShowLogin(true))}
          aria-expanded={showLogin}
          aria-controls="session-login-form"
          className="pressable flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-card text-muted-foreground hover:bg-muted/50 transition-colors border border-dashed border-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Lägg till
        </button>
      </div>

      {/* Kept mounted so it can open and close smoothly; inert while closed. */}
      <div className="collapsible" data-open={showLogin}>
        <div
          aria-hidden={!showLogin}
          ref={(el) => el?.toggleAttribute("inert", !showLogin)}
          className={`transition-opacity duration-300 ease-apple ${showLogin ? "opacity-100" : "opacity-0"}`}
        >
          <form
            id="session-login-form"
            onSubmit={handleAddLogin}
            className="mt-3 p-4 bg-muted/50 rounded-xl border border-border space-y-2"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Logga in som en annan klättrare
            </p>
            <p
              id="session-login-error"
              role="alert"
              className={cn("text-xs text-red-700 dark:text-red-300", !loginError && "sr-only")}
            >
              {loginError}
            </p>
            <input
              type="text"
              autoComplete="off"
              placeholder="Användarnamn"
              aria-label="Användarnamn"
              aria-invalid={loginError !== null}
              aria-describedby={loginError ? "session-login-error" : undefined}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-base"
              required
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Lösenord"
              aria-label="Lösenord"
              aria-invalid={loginError !== null}
              aria-describedby={loginError ? "session-login-error" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base"
              required
            />
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loginLoading || isCoolingDown}
                className="btn-primary flex-1 text-sm"
              >
                {loginLoading ? "Loggar in..." : "Logga in"}
              </button>
              <button type="button" onClick={closeLogin} className="btn-secondary text-sm">
                Avbryt
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
