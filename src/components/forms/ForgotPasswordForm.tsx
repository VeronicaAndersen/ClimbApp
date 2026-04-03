import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "@/services/api";
import { Button, Card, TextField, Spinner } from "@radix-ui/themes";
import { Label } from "@radix-ui/react-context-menu";
import CalloutMessage from "../user_feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";

export function ForgotPasswordForm() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccess(false);

    try {
      await requestPasswordReset({ username: username.trim().toLowerCase() });
      setSuccess(true);
      setUsername("");
    } catch (error) {
      setErrorMessage(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 flex items-center justify-center">
      <Card className="w-full h-fit max-w-md p-6 bg-white/95 backdrop-blur shadow-xl">
        {errorMessage && <CalloutMessage message={errorMessage} color="red" />}
        {success && (
          <CalloutMessage
            message="Om användarnamnet finns i systemet och ett e-postmeddelande är kopplat till kontot kommer du att få en återställningslänk."
            color="green"
          />
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h1 className="text-2xl font-semibold text-center mb-4">Glömt lösenord</h1>
          <p className="text-sm text-gray-600 text-center">
            Ange ditt användarnamn så skickar vi en länk för att återställa ditt lösenord.
          </p>
          <div className="space-y-2">
            <Label>Användarnamn</Label>
            <TextField.Root
              id="username"
              type="text"
              autoComplete="username"
              placeholder="Användarnamn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full text-base"
              disabled={loading || success}
            />
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer rounded-full bg-[--secondary-color] hover:bg-[--secondary-color-hover] disabled:bg-[--secondary-color]/50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={!username || loading || success}
          >
            {loading ? (
              <>
                <Spinner size="2" className="mr-2" /> Skickar...
              </>
            ) : (
              "Skicka återställningslänk"
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
