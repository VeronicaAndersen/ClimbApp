import { useState } from "react";
import type { LoginRequest } from "@/types";
import { Link, useNavigate } from "react-router-dom";
import { loginClimber } from "@/services/api";
import { Button, Card, TextField, Spinner } from "@radix-ui/themes";
import CalloutMessage from "../feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { useCooldown } from "@/hooks/useCooldown";
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  normalizeUsername,
  validatePassword,
  validateUsername,
} from "@/utils/inputValidation";
import { FieldError } from "./FieldError";

export function LoginForm() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { isCoolingDown, startCooldownFor } = useCooldown();

  const [loginData, setLoginData] = useState<LoginRequest>({ username: "", password: "" });
  const usernameError = validateUsername(loginData.username);
  const passwordError = validatePassword(loginData.password, { requireMinLength: false });

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
                setLoginData({ ...loginData, username: e.target.value.toLowerCase() })
              }
              required
              maxLength={USERNAME_MAX_LENGTH}
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
              maxLength={PASSWORD_MAX_LENGTH}
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
              <span>
                <Spinner size="2" className="mr-2" aria-hidden="true" />
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
