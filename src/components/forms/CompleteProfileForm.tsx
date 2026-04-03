import { useState } from "react";
import { Button, TextField, Spinner } from "@radix-ui/themes";
import * as Label from "@radix-ui/react-label";
import CalloutMessage from "../user_feedback/CalloutMessage";
import { updateMyInfo } from "@/services/api";
import { MyInfoResponse, ClimberUpdateRequest } from "@/types";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface CompleteProfileFormProps {
  userInfo: MyInfoResponse;
  onComplete: () => void;
}

export function CompleteProfileForm({ userInfo, onComplete }: CompleteProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gdprConsent, setGdprConsent] = useState(false);

  const [formData, setFormData] = useState({
    email: userInfo.email || "",
    firstname: userInfo.firstname || "",
    lastname: userInfo.lastname || "",
    club: userInfo.club || "",
  });

  const missingFields = {
    email: !userInfo.email,
    firstname: !userInfo.firstname,
    lastname: !userInfo.lastname,
  };

  const hasMissingFields = missingFields.email || missingFields.firstname || missingFields.lastname;

  const isSubmitDisabled =
    (missingFields.email && !formData.email) ||
    (missingFields.firstname && !formData.firstname) ||
    (missingFields.lastname && !formData.lastname) ||
    !gdprConsent ||
    loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const payload: ClimberUpdateRequest = {};

      if (missingFields.email && formData.email.trim()) {
        payload.email = formData.email.trim();
      }
      if (missingFields.firstname && formData.firstname.trim()) {
        payload.firstname = formData.firstname.trim();
      }
      if (missingFields.lastname && formData.lastname.trim()) {
        payload.lastname = formData.lastname.trim();
      }
      if (formData.club.trim()) {
        payload.club = formData.club.trim();
      }

      await updateMyInfo(payload);
      onComplete();
    } catch (error) {
      setErrorMessage(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  if (!hasMissingFields) {
    return null;
  }

  return (
    <div className="flex flex-col bg-white/90 backdrop-blur p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-2">Komplettera din profil</h2>
      <p className="text-gray-600 mb-4">
        Vänligen fyll i följande uppgifter för att slutföra din profil.
      </p>

      {errorMessage && <CalloutMessage message={errorMessage} color="red" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {missingFields.email && (
          <div className="space-y-2">
            <Label.Root htmlFor="email">E-post *</Label.Root>
            <TextField.Root
              id="email"
              type="email"
              autoComplete="email"
              placeholder="E-post"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value.trim().toLowerCase() })
              }
              required
              className="w-full text-base"
              disabled={loading}
            />
          </div>
        )}

        {missingFields.firstname && (
          <div className="space-y-2">
            <Label.Root htmlFor="firstname">Förnamn *</Label.Root>
            <TextField.Root
              id="firstname"
              type="text"
              autoComplete="given-name"
              placeholder="Förnamn"
              value={formData.firstname}
              onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
              required
              className="w-full text-base"
              disabled={loading}
            />
          </div>
        )}

        {missingFields.lastname && (
          <div className="space-y-2">
            <Label.Root htmlFor="lastname">Efternamn *</Label.Root>
            <TextField.Root
              id="lastname"
              type="text"
              autoComplete="family-name"
              placeholder="Efternamn"
              value={formData.lastname}
              onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
              required
              className="w-full text-base"
              disabled={loading}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label.Root htmlFor="club">Klubb (valfritt)</Label.Root>
          <TextField.Root
            id="club"
            type="text"
            autoComplete="organization"
            placeholder="Klubb"
            value={formData.club}
            onChange={(e) => setFormData({ ...formData, club: e.target.value })}
            className="w-full text-base"
            disabled={loading}
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="gdpr-consent"
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
          />
          <Label.Root htmlFor="gdpr-consent" className="text-xs text-gray-700 leading-tight">
            Jag godkänner att mina personuppgifter (namn, e-post, klubb och lösenord) lagras för att
            kunna använda tjänsten. Uppgifterna används endast för inloggning och tävlingshantering.
          </Label.Root>
        </div>

        <Button
          type="submit"
          className="w-full cursor-pointer rounded-full bg-[--secondary-color] hover:bg-[--secondary-color-hover] disabled:bg-[--secondary-color]/50 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={isSubmitDisabled}
        >
          {loading ? (
            <>
              <Spinner size="2" className="mr-2" /> Sparar...
            </>
          ) : (
            "Spara profil"
          )}
        </Button>
      </form>
    </div>
  );
}
