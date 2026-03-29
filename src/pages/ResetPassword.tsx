import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "@/services/api";
import { Button, Card, TextField, Spinner } from "@radix-ui/themes";
import { Label } from "@radix-ui/react-context-menu";
import CalloutMessage from "@/components/user_feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Lösenorden matchar inte");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Lösenordet måste vara minst 6 tecken");
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
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      setErrorMessage(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <img src="./grepp.svg" alt="grepp logo" className="w-28 absolute top-8 left-5" />
        <Card className="w-80 h-fit max-w-md p-6 bg-white/95 backdrop-blur shadow-xl">
          <CalloutMessage message="Ogiltig återställningslänk" color="red" />
          <Link
            to="/"
            className="w-fit text-sm text-center text-[--secondary-color] underline flex justify-center mx-auto mt-4"
          >
            Tillbaka till inloggning
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <img src="./grepp.svg" alt="grepp logo" className="w-28 absolute top-8 left-5" />
      <Card className="w-80 h-fit max-w-md p-6 bg-white/95 backdrop-blur shadow-xl">
        {errorMessage && <CalloutMessage message={errorMessage} color="red" />}
        {success && (
          <CalloutMessage
            message="Lösenordet har ändrats! Du skickas till inloggningssidan..."
            color="green"
          />
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h1 className="text-2xl font-semibold text-center mb-4">Nytt lösenord</h1>
          <div className="space-y-2">
            <Label>Nytt lösenord</Label>
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
            <Label>Bekräfta lösenord</Label>
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
            className="w-full cursor-pointer rounded-full bg-[--secondary-color] hover:bg-[--secondary-color-hover] disabled:bg-[--secondary-color]/50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={!password || !confirmPassword || loading || success}
          >
            {loading ? (
              <>
                <Spinner size="2" className="mr-2" /> Sparar...
              </>
            ) : (
              "Spara nytt lösenord"
            )}
          </Button>

          <Link
            to="/"
            className="w-fit text-sm text-center text-[--secondary-color] underline flex justify-center mx-auto"
          >
            Tillbaka till inloggning
          </Link>
        </form>
      </Card>
    </div>
  );
}
