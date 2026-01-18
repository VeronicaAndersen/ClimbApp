import { useState, useEffect, useCallback } from "react";
import { RegistrationWithClimber } from "@/types";
import { getAllRegistrations, updateRegistrationApproval } from "@/services/api";
import { Spinner, Button } from "@radix-ui/themes";
import { Check, X } from "lucide-react";
import CalloutMessage from "./user_feedback/CalloutMessage";

interface RegistrationApprovalListProps {
  competitionId: number;
  refreshKey?: number;
}

export function RegistrationApprovalList({ competitionId, refreshKey }: RegistrationApprovalListProps) {
  const [registrations, setRegistrations] = useState<RegistrationWithClimber[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRegistrations(competitionId);
      setRegistrations(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunde inte hämta anmälda.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations, refreshKey]);

  const handleApprovalChange = async (userId: number, approved: boolean) => {
    setUpdatingId(userId);
    setError(null);

    try {
      await updateRegistrationApproval(competitionId, userId, approved);
      await fetchRegistrations();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Misslyckades att uppdatera godkännande.";
      setError(message);
    } finally {
      setUpdatingId(null);
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

  return (
    <div className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Anmälda</h2>

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
                    <td className="p-2 text-gray-800">{reg.climber_name}</td>
                    <td className="p-2">
                      <span
                        className="inline-block w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: getLevelColor(reg.level) }}
                        title={`Nivå ${reg.level}`}
                      />
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
