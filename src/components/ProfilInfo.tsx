import CalloutMessage from "./feedback/CalloutMessage";
import useGetUserInfo from "@/hooks/useGetUserInfo";
import { useUserCompetitions } from "@/hooks/useUserCompetitions";
import { Spinner } from "@radix-ui/themes";
import CompetitionSummaryCard from "./CompetitionSummaryCard";
import { CompleteProfileForm } from "./forms/CompleteProfileForm";

export default function ProfilInfo() {
  const { userInfo, messageInfo, loading, refetch } = useGetUserInfo();
  const {
    competitions,
    isLoading: competitionsLoading,
    error: competitionsError,
  } = useUserCompetitions();

  const isProfileIncomplete =
    userInfo && (!userInfo.email || !userInfo.firstname || !userInfo.lastname);

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
            <p className="text-lg">
              <strong>Namn:</strong> {userInfo.firstname} {userInfo.lastname}
            </p>
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
