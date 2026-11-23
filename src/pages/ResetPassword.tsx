import { AuthLayout } from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "@/services/api";
import { Button, Card, TextField, Spinner } from "@radix-ui/themes";
import CalloutMessage from "@/components/feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { useCooldown } from "@/hooks/useCooldown";
import { validatePassword } from "@/utils/inputValidation";

const REDIRECT_AFTER_RESET_MS = 3000;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Read the token once, then drop it from the address bar and history so it
  // can't leak through screenshots, shared URLs or the browser history.
  const [token] = useState(() => searchParams.get("token"));

  useEffect(() => {
    if (searchParams.has("token")) navigate("/reset-password", { replace: true });
  }, [searchParams, navigate]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isCoolingDown, startCooldownFor } = useCooldown({
    onExpire: () => setErrorMessage(null),
  });

  // After a successful reset, go to the login page; cancelled on unmount.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate("/"), REDIRECT_AFTER_RESET_MS);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Lösenorden matchar inte");
      return;
    }

    const passwordError = validatePassword(password, { requireMinLength: true });
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    if (!token) {
      setErrorMessage("Ogiltig återställningslänk");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset({ token, new_password: password });
      setSuccess(true);
    } catch (error) {
      setErrorMessage(getUserFriendlyError(error));
      startCooldownFor(error);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-sm h-fit p-6 sm:p-8 shadow-soft">
          <CalloutMessage message="Ogiltig återställningslänk" color="red" />
          <Link to="/" className="text-link w-fit flex justify-center mx-auto mt-4">
            Tillbaka till inloggning
          </Link>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm h-fit p-6 sm:p-8 shadow-soft">
        {errorMessage && <CalloutMessage message={errorMessage} color="red" />}
        {success && (
          <CalloutMessage
            message="Lösenordet har ändrats! Du skickas till inloggningssidan..."
            color="green"
          />
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight text-center mb-2">Nytt lösenord</h1>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Nytt lösenord
            </label>
            <TextField.Root
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Nytt lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-base"
              disabled={loading || success}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Bekräfta lösenord
            </label>
            <TextField.Root
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Bekräfta lösenord"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full text-base"
              disabled={loading || success}
            />
          </div>

          <Button
            type="submit"
            size="3"
            className="w-full cursor-pointer rounded-full disabled:cursor-not-allowed"
            disabled={!password || !confirmPassword || loading || success || isCoolingDown}
          >
            {loading ? (
              <>
                <Spinner size="2" className="mr-2" /> Sparar...
              </>
            ) : (
              "Spara nytt lösenord"
            )}
          </Button>

          <Link to="/" className="text-link w-fit flex justify-center mx-auto">
            Tillbaka till inloggning
          </Link>
        </form>
      </Card>
    </AuthLayout>
  );
}
