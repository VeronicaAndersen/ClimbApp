import { useState } from "react";
import CalloutMessage from "../feedback/CalloutMessage";
import { Spinner, Button } from "@radix-ui/themes";
import { useClimbers } from "@/hooks/useClimbers";
import { updateClimberById, deleteClimberById } from "@/services/api";
import { ClimberResponse, ClimberUpdateRequest } from "@/types";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface ClimberListProps {
  refreshKey?: number;
}

const USER_SCOPES = [
  { value: "climber", label: "Climber" },
  // { value: "setter", label: "Setter" },
  // { value: "analyst", label: "Analyst" },
  { value: "admin", label: "Admin" },
];

const emptyEditValues: ClimberUpdateRequest = {
  username: "",
  password: "",
  user_scope: "",
  email: "",
  firstname: "",
  lastname: "",
  club: "",
};

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("sv-SE");

export function ClimberList({ refreshKey }: ClimberListProps = {}) {
  const { climbers: climberList, loading, error, refetch } = useClimbers(refreshKey);

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
    setEditValues({
      username: climber.username,
      password: "",
      user_scope: climber.user_scope,
      email: climber.email ?? "",
      firstname: climber.firstname ?? "",
      lastname: climber.lastname ?? "",
      club: climber.club ?? "",
    });
    setRowError(null);
    setDeleteConfirm(null);
  };

  const handleSave = async (climberId: number) => {
    setSaving(climberId);
    setRowError(null);

    try {
      const payload: ClimberUpdateRequest = {};

      // Only include fields that have been changed
      if (editValues.username && editValues.username.trim()) {
        payload.username = editValues.username.trim();
      }
      if (editValues.password && editValues.password.trim()) {
        payload.password = editValues.password.trim();
      }
      if (editValues.user_scope && editValues.user_scope.trim()) {
        payload.user_scope = editValues.user_scope.trim();
      }
      if (editValues.email && editValues.email.trim()) {
        payload.email = editValues.email.trim();
      }
      if (editValues.firstname && editValues.firstname.trim()) {
        payload.firstname = editValues.firstname.trim();
      }
      if (editValues.lastname && editValues.lastname.trim()) {
        payload.lastname = editValues.lastname.trim();
      }
      if (editValues.club && editValues.club.trim()) {
        payload.club = editValues.club.trim();
      }

      // Don't send empty payload
      if (Object.keys(payload).length === 0) {
        setRowError({ id: climberId, message: "Inga ändringar att spara." });
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
                <th className="text-left p-2 font-semibold text-gray-700">Användarnamn</th>
                <th className="text-left p-2 font-semibold text-gray-700">E-post</th>
                <th className="text-left p-2 font-semibold text-gray-700">Förnamn</th>
                <th className="text-left p-2 font-semibold text-gray-700">Efternamn</th>
                <th className="text-left p-2 font-semibold text-gray-700">Klubb</th>
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
                          value={editValues.username}
                          onChange={(e) =>
                            setEditValues({ ...editValues, username: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                          disabled={isSavingRow}
                          placeholder="Användarnamn"
                          autoComplete="username"
                        />
                      ) : (
                        <span className="text-gray-800">{climber.username}</span>
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editValues.email}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              email: e.target.value.trim().toLowerCase(),
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                          disabled={isSavingRow}
                          placeholder="E-post"
                        />
                      ) : (
                        <span className="text-gray-800">{climber.email}</span>
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.firstname}
                          onChange={(e) =>
                            setEditValues({ ...editValues, firstname: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                          disabled={isSavingRow}
                          placeholder="Förnamn"
                        />
                      ) : (
                        <span className="text-gray-800">{climber.firstname}</span>
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.lastname}
                          onChange={(e) =>
                            setEditValues({ ...editValues, lastname: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                          disabled={isSavingRow}
                          placeholder="Efternamn"
                        />
                      ) : (
                        <span className="text-gray-800">{climber.lastname}</span>
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.club}
                          onChange={(e) => setEditValues({ ...editValues, club: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                          disabled={isSavingRow}
                          placeholder="Klubb"
                        />
                      ) : (
                        <span className="text-gray-800">{climber.club}</span>
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
                          className="w-full px-2 py-1 border border-gray-300 rounded text-base"
                          disabled={isSavingRow}
                          placeholder="Nytt lösenord (valfritt)"
                          autoComplete="new-password"
                        />
                      ) : (
                        <span className="text-gray-500">••••••••</span>
                      )}
                    </td>

                    <td className="p-2">
                      {isEditing ? (
                        <select
                          value={editValues.user_scope}
                          onChange={(e) =>
                            setEditValues({ ...editValues, user_scope: e.target.value })
                          }
                          className="w-full p-2 rounded-lg border text-base focus:outline-none focus:ring-2 focus:ring-[--secondary-color]"
                          disabled={isSavingRow}
                        >
                          {USER_SCOPES.map((scope) => (
                            <option key={scope.value} value={scope.value}>
                              {scope.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-800">{climber.user_scope}</span>
                      )}
                    </td>
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
                              className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white px-3 py-1 rounded disabled:opacity-50"
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
                          <CalloutMessage message={rowError!.message} color="red" />
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
