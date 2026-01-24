import { useState, useEffect, useCallback } from "react";
import { RegistrationWithClimber } from "@/types";
import { getAllRegistrations, updateRegistrationApproval, updateRegistrationLevel } from "@/services/api";
import { Spinner, Button } from "@radix-ui/themes";
import { Check, X, RefreshCw } from "lucide-react";
import CalloutMessage from "../user_feedback/CalloutMessage";
import { getUserFriendlyError } from "@/utils/errorMessages";

interface RegistrationApprovalListProps {
  competitionId: number;
  refreshKey?: number;
}

export function RegistrationApprovalList({
  competitionId,
  refreshKey,
}: RegistrationApprovalListProps) {
  const [registrations, setRegistrations] = useState<RegistrationWithClimber[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [changingLevelId, setChangingLevelId] = useState<number | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRegistrations(competitionId);
      setRegistrations(data || []);
    } catch (err) {
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations, refreshKey, localRefreshKey]);

  const handleApprovalChange = async (userId: number, approved: boolean) => {
    setUpdatingId(userId);
    setError(null);

    try {
      await updateRegistrationApproval(competitionId, userId, approved);

      // Optimistically update the local state
      setRegistrations((prev) =>
        prev.map((reg) => (reg.user_id === userId ? { ...reg, approved } : reg))
      );
    } catch (err) {
      setError(getUserFriendlyError(err));
      // Refetch on error to restore correct state
      setLocalRefreshKey((prev) => prev + 1);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await getAllRegistrations(competitionId);
      setRegistrations(data || []);
    } catch (err) {
      setError(getUserFriendlyError(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLevelChange = async (userId: number, newLevel: number) => {
    setChangingLevelId(userId);
    setError(null);

    try {
      await updateRegistrationLevel(competitionId, userId, newLevel);

      // Optimistically update the local state
      setRegistrations((prev) =>
        prev.map((reg) => (reg.user_id === userId ? { ...reg, level: newLevel } : reg))
      );
    } catch (err) {
      setError(getUserFriendlyError(err));
      // Refetch on error to restore correct state
      setLocalRefreshKey((prev) => prev + 1);
    } finally {
      setChangingLevelId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLevelColor = (level: number): string => {
    const levelColors: Record<number, string> = {
      1: "#C084FC",
      2: "#F9A8D4",
      3: "#FDBA74",
      4: "#FACC15",
      5: "#4ADE80",
      6: "#FFFFFF",
      7: "#000000",
    };
    return levelColors[level] ?? "#D1D5DB";
  };

  const LEVEL_NAMES: Record<number, string> = {
    1: "Lila",
    2: "Rosa",
    3: "Orange",
    4: "Gul",
    5: "Grön",
    6: "Vit",
    7: "Svart",
  };

  return (
    <div className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Anmälda</h2>
        <Button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          size="2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && <CalloutMessage message={error} color="red" />}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar anmälda...</span>
        </div>
      ) : registrations && registrations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left p-2 font-semibold text-gray-700">Id</th>
                <th className="text-left p-2 font-semibold text-gray-700">Klättrare</th>
                <th className="text-left p-2 font-semibold text-gray-700">Nivå</th>
                <th className="text-left p-2 font-semibold text-gray-700">Registrerad</th>
                <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                <th className="text-center p-2 font-semibold text-gray-700">Åtgärd</th>
              </tr>
            </thead>

            <tbody>
              {registrations.map((reg) => {
                const isUpdating = updatingId === reg.user_id;

                return (
                  <tr
                    key={`${reg.comp_id}-${reg.user_id}`}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="p-2 text-gray-800">{reg.user_id}</td>
                    <td className="p-2 text-gray-800">{reg.climber_name}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-6 h-6 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: getLevelColor(reg.level) }}
                          title={`Nivå ${reg.level}`}
                        />
                        <select
                          value={reg.level}
                          onChange={(e) => handleLevelChange(reg.user_id, Number(e.target.value))}
                          disabled={changingLevelId === reg.user_id}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                            <option key={level} value={level}>
                              {LEVEL_NAMES[level]}
                            </option>
                          ))}
                        </select>
                        {changingLevelId === reg.user_id && <Spinner size="1" />}
                      </div>
                    </td>
                    <td className="p-2 text-gray-600 text-sm">{formatDate(reg.created_at)}</td>
                    <td className="p-2 text-center">
                      {reg.approved ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Godkänd
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Väntar
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        {reg.approved ? (
                          <Button
                            onClick={() => handleApprovalChange(reg.user_id, false)}
                            disabled={isUpdating}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded disabled:opacity-50"
                            size="1"
                          >
                            {isUpdating ? <Spinner size="1" /> : <X className="w-4 h-4" />}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleApprovalChange(reg.user_id, true)}
                            disabled={isUpdating}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                            size="1"
                          >
                            {isUpdating ? <Spinner size="1" /> : <Check className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">Inga anmälda för denna tävling.</p>
      )}
    </div>
  );
}
