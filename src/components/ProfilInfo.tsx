import { useState } from "react";
import CalloutMessage from "./feedback/CalloutMessage";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import { useUserCompetitions } from "@/hooks/useUserCompetitions";
import { Button, Spinner, TextField } from "@radix-ui/themes";
import { Pencil, Check, X } from "lucide-react";
import CompetitionSummaryCard from "./CompetitionSummaryCard";
import { CompleteProfileForm } from "./forms/CompleteProfileForm";
import { updateMyInfo } from "@/services/api";
import { getUserFriendlyError } from "@/utils/errorMessages";

export default function ProfilInfo() {
  const { userInfo, messageInfo, loading, refetch } = useGetUserInfo();
  const {
    competitions,
    isLoading: competitionsLoading,
    error: competitionsError,
  } = useUserCompetitions();

  const isProfileIncomplete =
    userInfo && (!userInfo.email || !userInfo.firstname || !userInfo.lastname);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameForm, setNameForm] = useState({ firstname: "", lastname: "" });
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const startEditName = () => {
    setNameForm({ firstname: userInfo?.firstname ?? "", lastname: userInfo?.lastname ?? "" });
    setNameError(null);
    setIsEditingName(true);
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setNameError(null);
  };

  const handleSaveName = async () => {
    const firstname = nameForm.firstname.trim();
    const lastname = nameForm.lastname.trim();

    if (!firstname || !lastname) {
      setNameError("Förnamn och efternamn kan inte vara tomma.");
      return;
    }

    setSavingName(true);
    setNameError(null);

    try {
      await updateMyInfo({ firstname, lastname });
      await refetch();
      setIsEditingName(false);
    } catch (err) {
      setNameError(getUserFriendlyError(err));
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Complete Profile Form - shown if required fields are missing */}
      {userInfo && isProfileIncomplete && (
        <CompleteProfileForm userInfo={userInfo} onComplete={refetch} />
      )}

      {/* User Info Section */}
      <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Min Profil</h2>
        {messageInfo && <CalloutMessage message={messageInfo.message} color={messageInfo.color} />}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="3" />
            <span className="ml-2">Hämtar profilinformation...</span>
          </div>
        ) : userInfo ? (
          <div className="space-y-2">
            {isEditingName ? (
              <div className="space-y-2 mb-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <TextField.Root
                    value={nameForm.firstname}
                    onChange={(e) => setNameForm({ ...nameForm, firstname: e.target.value })}
                    placeholder="Förnamn"
                    autoComplete="given-name"
                    disabled={savingName}
                    className="w-full text-base"
                  />
                  <TextField.Root
                    value={nameForm.lastname}
                    onChange={(e) => setNameForm({ ...nameForm, lastname: e.target.value })}
                    placeholder="Efternamn"
                    autoComplete="family-name"
                    disabled={savingName}
                    className="w-full text-base"
                  />
                </div>
                {nameError && <CalloutMessage message={nameError} color="red" />}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                    size="1"
                  >
                    {savingName ? <Spinner size="1" /> : <Check className="w-4 h-4" />}
                    Spara
                  </Button>
                  <Button
                    onClick={cancelEditName}
                    disabled={savingName}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded disabled:opacity-50"
                    size="1"
                  >
                    <X className="w-4 h-4" />
                    Avbryt
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-lg flex items-center gap-2">
                <strong>Namn:</strong> {userInfo.firstname} {userInfo.lastname}
                <button
                  onClick={startEditName}
                  className="text-gray-400 hover:text-[--secondary-color]"
                  title="Ändra namn"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </p>
            )}
            <p className="text-sm text-gray-600">
              <strong>Användarnamn:</strong> {userInfo.username}
            </p>
            <p className="text-sm text-gray-600">
              <strong>E-post:</strong> {userInfo.email}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Klubb:</strong> {userInfo.club}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Klättrar-ID:</strong> {userInfo.id}
            </p>
            <p className="text-sm text-gray-600">
              Medlem sedan: {new Date(userInfo.created_at).toLocaleDateString("sv-SE")}
            </p>
          </div>
        ) : (
          <p>Ingen information tillgänglig.</p>
        )}
      </div>

      {/* Competition History Section */}
      <div className="flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Mina Tävlingar</h2>

        {competitionsError && <CalloutMessage message={competitionsError} color="red" />}

        {competitionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="3" />
            <span className="ml-2">Hämtar tävlingshistorik...</span>
          </div>
        ) : competitions.length > 0 ? (
          <div className="space-y-4">
            {competitions.map((compData) => (
              <CompetitionSummaryCard key={compData.competition.id} competitionData={compData} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 py-8">
            Du har inte deltagit i några tävlingar ännu.
          </p>
        )}
      </div>
    </div>
  );
}
