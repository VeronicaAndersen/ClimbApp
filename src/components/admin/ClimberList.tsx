import { useState } from "react";
import CalloutMessage from "../feedback/CalloutMessage";
import { Spinner } from "@radix-ui/themes";
import { useClimbers } from "@/hooks/useClimbers";
import { useClimberEditing } from "@/hooks/useClimberEditing";
import {
  useClimberSearchSort,
  type SortDirection,
  type SortField,
} from "@/hooks/useClimberSearchSort";
import { ClimberResponse } from "@/types";
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { ClimberStatsModal } from "./ClimberStatsModal";
import { ClimberRow } from "./climbers/ClimberRow";
import { ClimberEditRow } from "./climbers/ClimberEditRow";

interface ClimberListProps {
  refreshKey?: number;
}

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
  const editing = useClimberEditing(climberList, refetch);
  const { searchQuery, setSearchQuery, sortField, sortDirection, handleSort, displayedClimbers } =
    useClimberSearchSort(climberList);
  const [statsClimber, setStatsClimber] = useState<ClimberResponse | null>(null);

  return (
    <div className="mb-6 h-fit flex flex-col bg-card/90 backdrop-blur p-4 rounded-lg shadow-soft">
      <h2 className="text-2xl font-semibold text-center mb-4">Klättrare</h2>

      {error && <CalloutMessage message={error} color="red" />}

      {!loading && climberList.length > 0 && (
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
      ) : climberList.length > 0 ? (
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
                {displayedClimbers.map((climber) =>
                  editing.editingId === climber.id ? (
                    <ClimberEditRow
                      key={climber.id}
                      climber={climber}
                      values={editing.editValues}
                      isSaving={editing.saving === climber.id}
                      error={editing.errorFor(climber.id)}
                      onFieldChange={editing.updateField}
                      onSave={editing.handleSave}
                      onCancel={editing.cancelEdit}
                    />
                  ) : (
                    <ClimberRow
                      key={climber.id}
                      climber={climber}
                      isSaving={editing.saving === climber.id}
                      isDeleting={editing.deleting === climber.id}
                      showDeleteConfirm={editing.deleteConfirm === climber.id}
                      editLocked={editing.editingId !== null}
                      error={editing.errorFor(climber.id)}
                      onShowStats={setStatsClimber}
                      onEdit={editing.startEdit}
                      onRequestDelete={editing.requestDelete}
                      onConfirmDelete={editing.handleDelete}
                      onCancelDelete={editing.cancelDelete}
                    />
                  )
                )}
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
