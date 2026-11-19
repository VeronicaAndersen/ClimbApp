import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "@/services/api";
import { Button, Card, TextField, Spinner } from "@radix-ui/themes";
import CalloutMessage from "../feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { useCooldown } from "@/hooks/useCooldown";
import { normalizeUsername, validateUsername } from "@/utils/inputValidation";
import { useServerFieldErrors } from "@/hooks/useServerFieldErrors";
import { FieldError } from "./FieldError";

export function ForgotPasswordForm() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isCoolingDown, startCooldownFor } = useCooldown({
    onExpire: () => setErrorMessage(null),
  });
  const { serverErrorFor, recordServerErrors, clearServerErrors } = useServerFieldErrors({
    username,
  });
  const usernameError = validateUsername(username) ?? serverErrorFor("username");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccess(false);

    try {
      await requestPasswordReset({ username: normalizeUsername(username) });
      setSuccess(true);
      setUsername("");
      clearServerErrors();
    } catch (error) {
      setErrorMessage(getUserFriendlyError(error));
      recordServerErrors(error, { username });
      startCooldownFor(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm flex items-center justify-center">
      <Card className="w-full h-fit p-6 sm:p-8 shadow-soft">
        <CalloutMessage message={errorMessage ?? ""} color="red" />
        <CalloutMessage
          message={
            success
              ? "Om användarnamnet finns i systemet och ett e-postmeddelande är kopplat till kontot kommer du att få en återställningslänk."
              : ""
          }
          color="green"
        />
        <form onSubmit={handleSubmit} className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-center mb-2">Glömt lösenord</h1>
          <p className="text-sm text-muted-foreground text-center">
            Ange ditt användarnamn så skickar vi en länk för att återställa ditt lösenord.
          </p>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Användarnamn
            </label>
            <TextField.Root
              id="username"
              type="text"
              autoComplete="username"
              placeholder="Användarnamn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              aria-invalid={usernameError !== null}
              aria-describedby={usernameError ? "username-error" : undefined}
              className="w-full text-base"
              disabled={loading || success}
            />
            <FieldError id="username-error" message={usernameError} />
          </div>

          <Button
            type="submit"
            size="3"
            className="w-full cursor-pointer rounded-full disabled:cursor-not-allowed"
            disabled={!username || usernameError !== null || loading || success || isCoolingDown}
          >
            {loading ? (
              <>
                <Spinner size="2" className="mr-2" /> Skickar...
              </>
            ) : (
              "Skicka återställningslänk"
            )}
          </Button>

          <Link to="/" className="text-link w-fit flex justify-center mx-auto">
            Tillbaka till inloggning
          </Link>
        </form>
      </Card>
    </div>
  );
}
