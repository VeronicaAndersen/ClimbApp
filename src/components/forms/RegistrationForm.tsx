import { useState } from "react";
import type { RegistrationRequest } from "@/types";
import { signupClimber } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import * as Label from "@radix-ui/react-label";
import { Card, Button, TextField, Spinner } from "@radix-ui/themes";
import CalloutMessage from "../feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";
import { useCooldown } from "@/hooks/useCooldown";
import {
  PASSWORD_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  normalizeUsername,
  validatePassword,
  validateTextField,
  validateUsername,
} from "@/utils/inputValidation";
import { FieldError } from "./FieldError";

export function RegistrationForm() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { isCoolingDown, startCooldownFor } = useCooldown();

  const [registerClimberData, setRegisterClimberData] = useState<RegistrationRequest>({
    username: "",
    password: "",
    email: "",
    firstname: "",
    lastname: "",
    club: "",
  });
  const [gdprConsent, setGdprConsent] = useState<boolean>(false);

  const fieldErrors = {
    username: validateUsername(registerClimberData.username),
    password: validatePassword(registerClimberData.password, { requireMinLength: true }),
    email: validateTextField(registerClimberData.email, "E-post"),
    firstname: validateTextField(registerClimberData.firstname, "Förnamn"),
    lastname: validateTextField(registerClimberData.lastname, "Efternamn"),
    club: validateTextField(registerClimberData.club ?? "", "Klubb"),
  };
  const hasFieldErrors = Object.values(fieldErrors).some((message) => message !== null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await signupClimber({
        ...registerClimberData,
        username: normalizeUsername(registerClimberData.username),
        email: registerClimberData.email.trim().toLowerCase(),
      });
      if (result) {
        // Tokens are automatically saved in signupClimber
        navigate("/profile");
      }
    } catch (error) {
      setErrorMessage(getUserFriendlyError(error));
      startCooldownFor(error);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    !registerClimberData.username ||
    !registerClimberData.password ||
    hasFieldErrors ||
    !registerClimberData.email ||
    !registerClimberData.firstname ||
    !registerClimberData.lastname ||
    !gdprConsent ||
    loading ||
    isCoolingDown;

  return (
    <div className="w-80 flex items-center justify-center">
      <Card className="w-full h-fit max-w-md p-6 bg-white/95 backdrop-blur shadow-xl">
        {errorMessage && <CalloutMessage message={errorMessage} color="red" />}
        <form onSubmit={handleRegister} className="space-y-6">
          <h2 className="text-2xl font-semibold text-center mb-4">Registrera dig</h2>
          <div className="space-y-2">
            <Label.Root htmlFor="username">Användarnamn</Label.Root>
            <TextField.Root
              id="username"
              type="text"
              autoComplete="username"
              placeholder="Användarnamn"
              value={registerClimberData.username}
              onChange={(e) =>
                setRegisterClimberData({ ...registerClimberData, username: e.target.value })
              }
              required
              maxLength={USERNAME_MAX_LENGTH}
              aria-invalid={fieldErrors.username !== null}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
              className="w-full text-base"
              disabled={loading}
            />
            <FieldError id="username-error" message={fieldErrors.username} />
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="new_password">Lösenord</Label.Root>
            <TextField.Root
              id="new_password"
              type="password"
              autoComplete="new-password"
              placeholder="Lösenord"
              value={registerClimberData.password}
              onChange={(e) =>
                setRegisterClimberData({ ...registerClimberData, password: e.target.value })
              }
              required
              maxLength={PASSWORD_MAX_LENGTH}
              aria-invalid={fieldErrors.password !== null}
              aria-describedby={fieldErrors.password ? "new_password-error" : undefined}
              className="w-full text-base"
              disabled={loading}
            />
            <FieldError id="new_password-error" message={fieldErrors.password} />
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="email">E-post</Label.Root>
            <TextField.Root
              id="email"
              type="email"
              autoComplete="email"
              placeholder="E-post"
              value={registerClimberData.email}
              onChange={(e) =>
                setRegisterClimberData({
                  ...registerClimberData,
                  email: e.target.value,
                })
              }
              required
              aria-invalid={fieldErrors.email !== null}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className="w-full text-base"
              disabled={loading}
            />
            <FieldError id="email-error" message={fieldErrors.email} />
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="firstname">Förnamn</Label.Root>
            <TextField.Root
              id="firstname"
              type="text"
              autoComplete="given-name"
              placeholder="Förnamn"
              value={registerClimberData.firstname}
              onChange={(e) =>
                setRegisterClimberData({ ...registerClimberData, firstname: e.target.value })
              }
              required
              aria-invalid={fieldErrors.firstname !== null}
              aria-describedby={fieldErrors.firstname ? "firstname-error" : undefined}
              className="w-full text-base"
              disabled={loading}
            />
            <FieldError id="firstname-error" message={fieldErrors.firstname} />
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="lastname">Efternamn</Label.Root>
            <TextField.Root
              id="lastname"
              type="text"
              autoComplete="family-name"
              placeholder="Efternamn"
              value={registerClimberData.lastname}
              onChange={(e) =>
                setRegisterClimberData({ ...registerClimberData, lastname: e.target.value })
              }
              required
              aria-invalid={fieldErrors.lastname !== null}
              aria-describedby={fieldErrors.lastname ? "lastname-error" : undefined}
              className="w-full text-base"
              disabled={loading}
            />
            <FieldError id="lastname-error" message={fieldErrors.lastname} />
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="club">Klubb (valfritt)</Label.Root>
            <TextField.Root
              id="club"
              type="text"
              autoComplete="organization"
              placeholder="Klubb"
              value={registerClimberData.club}
              onChange={(e) =>
                setRegisterClimberData({ ...registerClimberData, club: e.target.value })
              }
              aria-invalid={fieldErrors.club !== null}
              aria-describedby={fieldErrors.club ? "club-error" : undefined}
              className="w-full text-base"
              disabled={loading}
            />
            <FieldError id="club-error" message={fieldErrors.club} />
          </div>

          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="gdpr-consent"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 cursor-pointer disabled:cursor-not-allowed text-base"
            />
            <Label.Root htmlFor="gdpr-consent" className="text-xs text-gray-700 leading-tight">
              Jag godkänner att mina personuppgifter (namn, e-post, klubb och lösenord) lagras för
              att kunna använda tjänsten. Uppgifterna används endast för inloggning och
              tävlingshantering.
            </Label.Root>
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer rounded-full bg-[--secondary-color] hover:bg-[--secondary-color-hover] disabled:bg-[--secondary-color]/50 disabled:cursor-not-allowed flex items-center justify-center"
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
            className="w-fit text-sm text-center text-[--secondary-color] underline flex justify-center mx-auto"
          >
            Redan ett konto? Klicka här!
          </Link>
        </form>
      </Card>
    </div>
  );
}
