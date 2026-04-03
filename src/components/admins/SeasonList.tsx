import { useState, useMemo } from "react";
import { Spinner, Button } from "@radix-ui/themes";
import { useSeasons } from "@/hooks/useSeasons";
import { updateSeasonById, deleteSeasonById } from "@/services/api";
import { SeasonResponse, SeasonRequest } from "@/types";
import { Pencil, Trash2, Check, X } from "lucide-react";
import CalloutMessage from "../user_feedback/CalloutMessage";

interface SeasonListProps {
  refreshKey?: number;
}

export function SeasonList({ refreshKey }: SeasonListProps = {}) {
  const { seasons: seasonList, loading, error, refetch } = useSeasons(refreshKey);

  const emptyEditValues: SeasonRequest = { name: "", year: null };

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<SeasonRequest>(emptyEditValues);
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fields = useMemo<(keyof SeasonRequest)[]>(() => ["name", "year"], []);

  const resetState = () => {
    setEditingId(null);
    setEditValues(emptyEditValues);
    setRowError(null);
  };

  const startEdit = (season: SeasonResponse) => {
    setEditingId(season.id);
    setEditValues({ name: season.name, year: season.year });
    setRowError(null);
    setDeleteConfirm(null);
  };

  const handleSave = async (seasonId: number) => {
    setSaving(seasonId);
    setRowError(null);

    try {
      const payload: SeasonRequest = {
        name: editValues.name.trim(),
        year: editValues.year,
      };

      await updateSeasonById(seasonId, payload);
      resetState();
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Misslyckades att uppdatera säsong.";
      setRowError({ id: seasonId, message });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (seasonId: number) => {
    setDeleting(seasonId);
    setRowError(null);
    setDeleteConfirm(null);

    try {
      await deleteSeasonById(seasonId);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Misslyckades att radera säsong.";
      setRowError({ id: seasonId, message });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Säsonger</h2>

      {error && <CalloutMessage message={error} color="red" />}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar säsonger...</span>
        </div>
      ) : seasonList && seasonList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left p-2 font-semibold text-gray-700">ID</th>
                {fields.map((f) => (
                  <th key={f} className="text-left p-2 font-semibold text-gray-700 capitalize">
                    {f}
                  </th>
                ))}
                <th className="text-center p-2 font-semibold text-gray-700">Åtgärder</th>
              </tr>
            </thead>

            <tbody>
              {seasonList.map((season) => {
                const isEditing = editingId === season.id;
                const isSavingRow = saving === season.id;
                const isDeletingRow = deleting === season.id;
                const showDeleteConfirm = deleteConfirm === season.id;
                const errorForRow = rowError?.id === season.id;

                return (
                  <tr key={season.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-2 text-gray-800">{season.id}</td>

                    {fields.map((field) => (
                      <td key={field} className="p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues[field]}
                            onChange={(e) =>
                              setEditValues({ ...editValues, [field]: e.target.value })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                            disabled={isSavingRow}
                          />
                        ) : (
                          <span className="text-gray-800">{season[field]}</span>
                        )}
                      </td>
                    ))}

                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              onClick={() => handleSave(season.id)}
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
                              onClick={() => startEdit(season)}
                              disabled={isSavingRow || isDeletingRow || editingId !== null}
                              className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white px-3 py-1 rounded disabled:opacity-50"
                              size="1"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {showDeleteConfirm ? (
                              <>
                                <Button
                                  onClick={() => handleDelete(season.id)}
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
                                onClick={() => setDeleteConfirm(season.id)}
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
        <p className="text-center text-gray-500 py-4">Inga säsonger tillgängliga.</p>
      )}
    </div>
  );
}
