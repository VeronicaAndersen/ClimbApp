import { useMemo, useState } from "react";
import CalloutMessage from "../feedback/CalloutMessage";
import { Spinner, Button } from "@radix-ui/themes";
import { useClimbers } from "@/hooks/useClimbers";
import { updateClimberById, deleteClimberById } from "@/services/api";
import { ClimberResponse, ClimberUpdateRequest } from "@/types";
import {
  normalizeNewUsername,
  normalizeUsername,
  validateNewUsername,
} from "@/utils/inputValidation";
import {
  Pencil,
  Trash2,
  Check,
  X,
  BarChart3,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { ClimberStatsModal } from "./ClimberStatsModal";
import { getUserFriendlyError } from "@/utils/errorMessages";

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

type SortField = "firstname" | "lastname";
type SortDirection = "asc" | "desc";

interface SortableHeaderProps {
  label: string;
  field: SortField;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortableHeader({ label, field, sortField, sortDirection, onSort }: SortableHeaderProps) {
  const isActive = sortField === field;
  const Icon = isActive ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="text-left p-2 font-semibold text-muted-foreground">
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 hover:text-foreground ${isActive ? "text-foreground" : ""}`}
      >
        {label}
        <Icon className={`w-3.5 h-3.5 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
      </button>
    </th>
  );
}

export function ClimberList({ refreshKey }: ClimberListProps = {}) {
  const { climbers: climberList, loading, error, refetch } = useClimbers(refreshKey);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<ClimberUpdateRequest>(emptyEditValues);
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [statsClimber, setStatsClimber] = useState<ClimberResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const displayedClimbers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? (climberList ?? []).filter((climber) =>
          [climber.username, climber.firstname, climber.lastname, climber.email, climber.club]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(query))
        )
      : (climberList ?? []);

    if (!sortField) return filtered;

    const sorted = [...filtered].sort((a, b) =>
      (a[sortField] ?? "").localeCompare(b[sortField] ?? "", "sv", { sensitivity: "base" })
    );
    if (sortDirection === "desc") sorted.reverse();
    return sorted;
  }, [climberList, searchQuery, sortField, sortDirection]);

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

      // Only include fields that have been changed. An unchanged username is
      // neither validated nor sent: legacy names may break the new-name rule.
      const currentClimber = (climberList ?? []).find((c) => c.id === climberId);
      const usernameChanged =
        normalizeUsername(editValues.username ?? "") !==
        normalizeUsername(currentClimber?.username ?? "");
      if (usernameChanged && editValues.username && editValues.username.trim()) {
        const usernameError = validateNewUsername(editValues.username);
        if (usernameError) {
          setRowError({ id: climberId, message: usernameError });
          return;
        }
        payload.username = normalizeNewUsername(editValues.username);
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
      const message = getUserFriendlyError(err);
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
      const message = getUserFriendlyError(err);
      setRowError({ id: climberId, message });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mb-6 h-fit flex flex-col bg-card/90 backdrop-blur p-4 rounded-lg shadow-soft">
      <h2 className="text-2xl font-semibold text-center mb-4">Klättrare</h2>

      {error && <CalloutMessage message={error} color="red" />}

      {!loading && climberList && climberList.length > 0 && (
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök på namn, användarnamn, e-post eller klubb..."
            className="input-base pl-9 pr-3 py-2.5"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="3" />
          <span className="ml-2">Hämtar klättrare...</span>
        </div>
      ) : climberList && climberList.length > 0 ? (
        displayedClimbers.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Inga klättrare matchar "{searchQuery}".
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-muted-foreground">ID</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">
                    Användarnamn
                  </th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">E-post</th>
                  <SortableHeader
                    label="Förnamn"
                    field="firstname"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Efternamn"
                    field="lastname"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="text-left p-2 font-semibold text-muted-foreground">Klubb</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">Lösenord</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">Behörighet</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">Skapad</th>
                  <th className="text-center p-2 font-semibold text-muted-foreground">Åtgärder</th>
                </tr>
              </thead>

              <tbody>
                {displayedClimbers.map((climber) => {
                  const isEditing = editingId === climber.id;
                  const isSavingRow = saving === climber.id;
                  const isDeletingRow = deleting === climber.id;
                  const showDeleteConfirm = deleteConfirm === climber.id;
                  const errorForRow = rowError?.id === climber.id;

                  return (
                    <tr key={climber.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-2 text-foreground">{climber.id}</td>

                      <td className="p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.username}
                            onChange={(e) =>
                              setEditValues({ ...editValues, username: e.target.value })
                            }
                            className="input-base rounded px-2 py-1"
                            disabled={isSavingRow}
                            placeholder="Användarnamn"
                            autoComplete="username"
                          />
                        ) : (
                          <span className="text-foreground">{climber.username}</span>
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
                            className="input-base rounded px-2 py-1"
                            disabled={isSavingRow}
                            placeholder="E-post"
                          />
                        ) : (
                          <span className="text-foreground">{climber.email}</span>
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
                            className="input-base rounded px-2 py-1"
                            disabled={isSavingRow}
                            placeholder="Förnamn"
                          />
                        ) : (
                          <span className="text-foreground">{climber.firstname}</span>
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
                            className="input-base rounded px-2 py-1"
                            disabled={isSavingRow}
                            placeholder="Efternamn"
                          />
                        ) : (
                          <span className="text-foreground">{climber.lastname}</span>
                        )}
                      </td>

                      <td className="p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.club}
                            onChange={(e) => setEditValues({ ...editValues, club: e.target.value })}
                            className="input-base rounded px-2 py-1"
                            disabled={isSavingRow}
                            placeholder="Klubb"
                          />
                        ) : (
                          <span className="text-foreground">{climber.club}</span>
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
                            className="input-base rounded px-2 py-1"
                            disabled={isSavingRow}
                            placeholder="Nytt lösenord (valfritt)"
                            autoComplete="new-password"
                          />
                        ) : (
                          <span className="text-muted-foreground">••••••••</span>
                        )}
                      </td>

                      <td className="p-2">
                        {isEditing ? (
                          <select
                            value={editValues.user_scope}
                            onChange={(e) =>
                              setEditValues({ ...editValues, user_scope: e.target.value })
                            }
                            className="input-base p-2"
                            disabled={isSavingRow}
                          >
                            {USER_SCOPES.map((scope) => (
                              <option key={scope.value} value={scope.value}>
                                {scope.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-foreground">{climber.user_scope}</span>
                        )}
                      </td>
                      <td className="p-2 text-foreground">{formatDate(climber.created_at)}</td>

                      <td className="p-2">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                onClick={() => handleSave(climber.id)}
                                aria-label="Spara ändringar"
                                disabled={isSavingRow}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                                size="1"
                              >
                                {isSavingRow ? <Spinner size="1" /> : <Check className="w-4 h-4" />}
                              </Button>

                              <Button
                                onClick={resetState}
                                aria-label="Avbryt redigering"
                                disabled={isSavingRow}
                                className="bg-secondary hover:bg-accent text-secondary-foreground px-3 py-1 rounded disabled:opacity-50"
                                size="1"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => setStatsClimber(climber)}
                                disabled={isSavingRow || isDeletingRow}
                                className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded disabled:opacity-50"
                                size="1"
                                title="Visa statistik"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>

                              <Button
                                onClick={() => startEdit(climber)}
                                aria-label={`Redigera ${climber.username}`}
                                disabled={isSavingRow || isDeletingRow || editingId !== null}
                                className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-1 rounded disabled:opacity-50"
                                size="1"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>

                              {showDeleteConfirm ? (
                                <>
                                  <Button
                                    onClick={() => handleDelete(climber.id)}
                                    disabled={isDeletingRow}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-2 py-1 rounded text-xs disabled:opacity-50"
                                    size="1"
                                  >
                                    {isDeletingRow ? <Spinner size="1" /> : "Bekräfta"}
                                  </Button>

                                  <Button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={isDeletingRow}
                                    className="bg-secondary hover:bg-accent text-secondary-foreground px-2 py-1 rounded text-xs disabled:opacity-50"
                                    size="1"
                                  >
                                    Avbryt
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  onClick={() => setDeleteConfirm(climber.id)}
                                  disabled={isSavingRow || isDeletingRow || editingId !== null}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1 rounded disabled:opacity-50"
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
        )
      ) : (
        <p className="text-center text-muted-foreground py-4">Inga klättrare tillgängliga.</p>
      )}

      <ClimberStatsModal climber={statsClimber} onClose={() => setStatsClimber(null)} />
    </div>
  );
}
