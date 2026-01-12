import { useState } from "react";
import type { RegistrationRequest } from "@/types";
import { signupClimber } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import * as Label from "@radix-ui/react-label";
import { Card, Button, TextField, Spinner } from "@radix-ui/themes";
import CalloutMessage from "../user_feedback/CalloutMessage";

export function RegistrationForm() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [registerClimberData, setRegisterClimberData] = useState<RegistrationRequest>({
    name: "",
    password: "",
  });
  const [gdprConsent, setGdprConsent] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await signupClimber(registerClimberData);
      if (result) {
        // Tokens are automatically saved in signupClimber
        navigate("/profile");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Misslyckades att registrera. Försök igen.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    !registerClimberData.name ||
    !registerClimberData.password ||
    registerClimberData.password.length < 6 ||
    !gdprConsent ||
    loading;

  return (
    <div className="w-80 flex items-center justify-center">
      <Card className="w-full h-fit max-w-md p-6 bg-white/95 backdrop-blur shadow-xl">
        {errorMessage && <CalloutMessage message={errorMessage} color="red" />}
        <form onSubmit={handleRegister} className="space-y-6">
          <h2 className="text-2xl font-semibold text-center mb-4">Registrera dig</h2>
          <div className="space-y-2">
            <Label.Root htmlFor="username">Namn</Label.Root>
            <TextField.Root
              id="username"
              type="text"
              autoComplete="username"
              placeholder="Namn"
              value={registerClimberData.name}
              onChange={(e) =>
                setRegisterClimberData({ ...registerClimberData, name: e.target.value })
              }
              required
              className="w-full text-base"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="new_password">Lösenord</Label.Root>
            <TextField.Root
              id="new_password"
              type="password"
              autoComplete="new_password"
              placeholder="Lösenord"
              value={registerClimberData.password}
              onChange={(e) =>
                setRegisterClimberData({ ...registerClimberData, password: e.target.value })
              }
              required
              className="w-full text-base"
              disabled={loading}
            />
            {registerClimberData.password.length > 0 && registerClimberData.password.length < 6 && (
              <p className="text-red-500 text-xs italic">Måste innehålla minst sex tecken.</p>
            )}
          </div>

          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="gdpr-consent"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
            />
            <Label.Root htmlFor="gdpr-consent" className="text-xs text-gray-700 leading-tight">
              Jag godkänner att mina personuppgifter (namn och lösenord) lagras för att kunna
              använda tjänsten. Uppgifterna används endast för inloggning och tävlingshantering.
            </Label.Root>
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer rounded-full bg-[#505654] hover:bg-[#868f79] disabled:bg-[#505654]/50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={isSubmitDisabled}
          >
            {loading ? (
              <>
                <Spinner size="2" className="mr-2" /> Registrerar...
              </>
            ) : (
              "Registrera dig"
            )}
          </Button>

          <Link
            to="/"
            className="w-fit text-sm text-center text-[#505654] underline flex justify-center mx-auto"
          >
            Redan ett konto? Klicka här!
          </Link>
        </form>
      </Card>
    </div>
  );
}
