import { useState } from "react";
import CalloutMessage from "./user_feedback/CalloutMessage";
import { Spinner, Button } from "@radix-ui/themes";
import { useClimbers } from "@/hooks/useClimbers";
import { updateClimberById, deleteClimberById } from "@/services/api";
import { ClimberResponse, ClimberUpdateRequest } from "@/types";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface ClimberListProps {
  refreshKey?: number;
}

export function ClimberList({ refreshKey }: ClimberListProps = {}) {
  const { climbers: climberList, loading, error, refetch } = useClimbers(refreshKey);

  const emptyEditValues: ClimberUpdateRequest = { name: "", password: "" };

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<ClimberUpdateRequest>(emptyEditValues);
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const resetState = () => {
    setEditingId(null);
    setEditValues(emptyEditValues);
    setRowError(null);
  };

  const startEdit = (climber: ClimberResponse) => {
    setEditingId(climber.id);
    setEditValues({ name: climber.name, password: "" });
    setRowError(null);
    setDeleteConfirm(null);
  };

  const handleSave = async (climberId: number) => {
    setSaving(climberId);
    setRowError(null);

    try {
      const payload: ClimberUpdateRequest = {};

      // Only include fields that have been changed
      if (editValues.name && editValues.name.trim()) {
        payload.name = editValues.name.trim();
      }
      if (editValues.password && editValues.password.trim()) {
        payload.password = editValues.password.trim();
      }

      // Don't send empty payload
      if (Object.keys(payload).length === 0) {
        setRowError({ id: climberId, message: "Inga ändringar att spara." });
        setSaving(null);
        return;
      }

      await updateClimberById(climberId, payload);
      resetState();
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Misslyckades att uppdatera klättrare.";
      setRowError({ id: climberId, message });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (climberId: number) => {
    setDeleting(climberId);
    setRowError(null);
    setDeleteConfirm(null);

    try {
      await deleteClimberById(climberId);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Misslyckades att radera klättrare.";
      setRowError({ id: climberId, message });
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE");
  };

  return (
    <div className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Klättrare</h2>

      {error && <CalloutMessage message={error} color="red" />}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar klättrare...</span>
        </div>
      ) : climberList && climberList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left p-2 font-semibold text-gray-700">ID</th>
                <th className="text-left p-2 font-semibold text-gray-700">Namn</th>
                <th className="text-left p-2 font-semibold text-gray-700">Lösenord</th>
                <th className="text-left p-2 font-semibold text-gray-700">Behörighet</th>
                <th className="text-left p-2 font-semibold text-gray-700">Skapad</th>
                <th className="text-center p-2 font-semibold text-gray-700">Åtgärder</th>
              </tr>
            </thead>

            <tbody>
              {climberList.map((climber) => {
                const isEditing = editingId === climber.id;
                const isSavingRow = saving === climber.id;
                const isDeletingRow = deleting === climber.id;
                const showDeleteConfirm = deleteConfirm === climber.id;
                const errorForRow = rowError?.id === climber.id;

                return (
                  <tr key={climber.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-2 text-gray-800">{climber.id}</td>

                    <td className="p-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.name}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          disabled={isSavingRow}
                          placeholder="Nytt namn"
                        />
                      ) : (
                        <span className="text-gray-800">{climber.name}</span>
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <input
                          type="password"
                          value={editValues.password}
                          onChange={(e) =>
                            setEditValues({ ...editValues, password: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          disabled={isSavingRow}
                          placeholder="Nytt lösenord (valfritt)"
                        />
                      ) : (
                        <span className="text-gray-500">••••••••</span>
                      )}
                    </td>

                    <td className="p-2 text-gray-800">{climber.user_scope}</td>
                    <td className="p-2 text-gray-800">{formatDate(climber.created_at)}</td>

                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              onClick={() => handleSave(climber.id)}
                              disabled={isSavingRow}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                              size="1"
                            >
                              {isSavingRow ? <Spinner size="1" /> : <Check className="w-4 h-4" />}
                            </Button>

                            <Button
                              onClick={resetState}
                              disabled={isSavingRow}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded disabled:opacity-50"
                              size="1"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => startEdit(climber)}
                              disabled={isSavingRow || isDeletingRow || editingId !== null}
                              className="bg-[#505654] hover:bg-[#868f79] text-white px-3 py-1 rounded disabled:opacity-50"
                              size="1"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {showDeleteConfirm ? (
                              <>
                                <Button
                                  onClick={() => handleDelete(climber.id)}
                                  disabled={isDeletingRow}
                                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                                  size="1"
                                >
                                  {isDeletingRow ? <Spinner size="1" /> : "Bekräfta"}
                                </Button>

                                <Button
                                  onClick={() => setDeleteConfirm(null)}
                                  disabled={isDeletingRow}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                                  size="1"
                                >
                                  Avbryt
                                </Button>
                              </>
                            ) : (
                              <Button
                                onClick={() => setDeleteConfirm(climber.id)}
                                disabled={isSavingRow || isDeletingRow || editingId !== null}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded disabled:opacity-50"
                                size="1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      {errorForRow && (
                        <div className="mt-2">
                          <CalloutMessage message={rowError.message} color="red" />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">Inga klättrare tillgängliga.</p>
      )}
    </div>
  );
}
