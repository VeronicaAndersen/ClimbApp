import { useState, useMemo } from "react";
import CalloutMessage from "../user_feedback/CalloutMessage";
import { Spinner, Button } from "@radix-ui/themes";
import { useCompetitions } from "@/hooks/useCompetitions";
import { updateCompetitionById, deleteCompetitionById } from "@/services/api";
import { CompetitionResponse, CompetitionRequest } from "@/types";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface CompetitionListProps {
  refreshKey?: number;
}

export function CompetitionList({ refreshKey }: CompetitionListProps = {}) {
  const { competitions: compList, loading, error, refetch } = useCompetitions(refreshKey);

  const emptyEditValues: CompetitionRequest = {
    name: "",
    description: "",
    comp_type: "",
    comp_date: "",
    season_id: 0,
    round_no: null,
  };

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<CompetitionRequest>(emptyEditValues);
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fields = useMemo<(keyof CompetitionRequest)[]>(
    () => ["name", "description", "comp_type", "comp_date", "season_id", "round_no"],
    []
  );

  const resetState = () => {
    setEditingId(null);
    setEditValues(emptyEditValues);
    setRowError(null);
  };

  const startEdit = (competition: CompetitionResponse) => {
    setEditingId(competition.id);
    setEditValues({
      name: competition.name,
      description: competition.description,
      comp_type: competition.comp_type,
      comp_date: competition.comp_date,
      season_id: competition.season_id,
      round_no: competition.round_no,
    });
    setRowError(null);
    setDeleteConfirm(null);
  };

  const handleSave = async (competitionId: number) => {
    setSaving(competitionId);
    setRowError(null);

    try {
      const payload: CompetitionRequest = {
        name: editValues.name.trim(),
        description: editValues.description.trim(),
        comp_type: editValues.comp_type.trim(),
        comp_date: editValues.comp_date.trim(),
        season_id: editValues.season_id,
        round_no: editValues.comp_type.trim() === "FINAL" ? null : editValues.round_no,
      };

      await updateCompetitionById(competitionId, payload);
      resetState();
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Misslyckades att uppdatera.";
      setRowError({ id: competitionId, message });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (competitionId: number) => {
    setDeleting(competitionId);
    setRowError(null);
    setDeleteConfirm(null);

    try {
      await deleteCompetitionById(competitionId);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Misslyckades att radera.";
      setRowError({ id: competitionId, message });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Tävlingar</h2>

      {error && <CalloutMessage message={error} color="red" />}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar tävlingar...</span>
        </div>
      ) : compList && compList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="p-2 font-semibold text-gray-700 text-left">ID</th>
                {fields.map((f) => (
                  <th key={f} className="p-2 font-semibold text-gray-700 text-left capitalize">
                    {f.replace("_", " ")}
                  </th>
                ))}
                <th className="text-center p-2 font-semibold text-gray-700">Åtgärder</th>
              </tr>
            </thead>

            <tbody>
              {compList.map((competition) => {
                const isEditing = editingId === competition.id;
                const isSavingRow = saving === competition.id;
                const isDeletingRow = deleting === competition.id;
                const showDeleteConfirm = deleteConfirm === competition.id;
                const errorForRow = rowError?.id === competition.id;

                return (
                  <tr key={competition.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-2">
                      <span className="text-gray-600 font-mono text-sm">{competition.id}</span>
                    </td>
                    {fields.map((field) => (
                      <td key={field} className="p-2">
                        {isEditing ? (
                          field === "comp_type" ? (
                            <select
                              value={editValues[field]}
                              onChange={(e) =>
                                setEditValues({ ...editValues, [field]: e.target.value })
                              }
                              className="w-full p-2 rounded-lg border text-base focus:outline-none focus:ring-2 focus:ring-[--secondary-color]"
                              disabled={isSavingRow}
                            >
                              <option value="">Välj typ</option>
                              <option value="QUALIFIER">Qualifier</option>
                              <option value="FINAL">Final</option>
                            </select>
                          ) : field === "round_no" ? (
                            editValues.comp_type === "FINAL" ? (
                              <span className="text-gray-500 italic">-</span>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                max="4"
                                value={editValues[field] || ""}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    [field]: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                                disabled={isSavingRow}
                              />
                            )
                          ) : (
                            <input
                              type="text"
                              value={editValues[field]}
                              onChange={(e) =>
                                setEditValues({ ...editValues, [field]: e.target.value })
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                              disabled={isSavingRow}
                            />
                          )
                        ) : (
                          <span className="text-gray-800">
                            {field === "round_no" && !competition[field] ? "-" : competition[field]}
                          </span>
                        )}
                      </td>
                    ))}

                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              onClick={() => handleSave(competition.id)}
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
                              onClick={() => startEdit(competition)}
                              disabled={isSavingRow || isDeletingRow || editingId !== null}
                              className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              size="1"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {showDeleteConfirm ? (
                              <>
                                <Button
                                  onClick={() => handleDelete(competition.id)}
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
                                onClick={() => setDeleteConfirm(competition.id)}
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
