import { useState } from "react";
import type { LoginRequest } from "@/types";
import { Link, useNavigate } from "react-router-dom";
import { loginClimber } from "@/services/api";
import { Button, Card, TextField, Spinner } from "@radix-ui/themes";
import CalloutMessage from "../feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { useCooldown } from "@/hooks/useCooldown";
import { normalizeUsername, validatePassword, validateUsername } from "@/utils/inputValidation";
import { useServerFieldErrors } from "@/hooks/useServerFieldErrors";
import { FieldError } from "./FieldError";

export function LoginForm() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { isCoolingDown, startCooldownFor } = useCooldown({
    onExpire: () => setErrorMessage(null),
  });

  const [loginData, setLoginData] = useState<LoginRequest>({ username: "", password: "" });
  const { serverErrorFor, recordServerErrors } = useServerFieldErrors(loginData);
  const usernameError = validateUsername(loginData.username) ?? serverErrorFor("username");
  const passwordError =
    validatePassword(loginData.password, { requireMinLength: false }) ?? serverErrorFor("password");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginClimber({
        ...loginData,
        username: normalizeUsername(loginData.username),
      });
      if (result) {
        navigate("/profile");
      }
    } catch (error) {
      setErrorMessage(getUserFriendlyError(error));
      recordServerErrors(error, loginData);
      startCooldownFor(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 flex items-center justify-center">
      <Card className="w-full h-fit max-w-md p-6 bg-white/95 backdrop-blur shadow-xl">
        {errorMessage && <CalloutMessage message={errorMessage} color="red" />}
        <form onSubmit={handleLogin} className="space-y-6">
          <h1 className="text-2xl font-semibold text-center mb-4">Logga in</h1>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Användarnamn
            </label>
            <TextField.Root
              id="username"
              type="text"
              autoComplete="username"
              placeholder="Användarnamn"
              value={loginData.username}
              onChange={(e) =>
                // Kept as typed; normalizeUsername lowercases the whole name on
                // submit (per-keystroke lowercasing breaks Greek final sigma).
                setLoginData({ ...loginData, username: e.target.value })
              }
              required
              aria-invalid={usernameError !== null}
              aria-describedby={usernameError ? "username-error" : undefined}
              className="w-full text-base"
              disabled={loading}
            />
            <FieldError id="username-error" message={usernameError} />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Lösenord
            </label>
            <TextField.Root
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Lösenord"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
              aria-invalid={passwordError !== null}
              aria-describedby={passwordError ? "password-error" : undefined}
              className="w-full text-base"
              disabled={loading}
            />
            <FieldError id="password-error" message={passwordError} />
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer rounded-full bg-[--secondary-color] hover:bg-[--secondary-color-hover] disabled:bg-[--secondary-color]/50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={
              !loginData.username ||
              !loginData.password ||
              usernameError !== null ||
              passwordError !== null ||
              loading ||
              isCoolingDown
            }
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <Spinner size="2" aria-hidden="true" />
                Loggar in...
              </span>
            ) : (
              "Logga in"
            )}
          </Button>
          <span role="status" className="sr-only">
            {loading ? "Loggar in..." : ""}
          </span>

          <div className="flex flex-col items-center gap-2">
            <Link
              to="/forgot-password"
              className="text-sm text-gray-600 hover:text-[--secondary-color] underline"
            >
              Glömt lösenord?
            </Link>
            <Link to="/register" className="text-sm text-[--secondary-color] underline">
              Registrera dig
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
