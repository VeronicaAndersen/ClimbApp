import { Spinner, Button } from "@radix-ui/themes";
import { Pencil, Trash2, BarChart3 } from "lucide-react";
import { ClimberResponse } from "@/types";
import { formatDate } from "./formatDate";
import { RowError } from "./RowError";

export interface ClimberRowProps {
  climber: ClimberResponse;
  isSaving: boolean;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  /** True while any row is being edited; blocks editing and deleting others. */
  editLocked: boolean;
  error: string | null;
  onShowStats: (climber: ClimberResponse) => void;
  onEdit: (climber: ClimberResponse) => void;
  onRequestDelete: (climberId: number) => void;
  onConfirmDelete: (climberId: number) => void;
  onCancelDelete: () => void;
}

export function ClimberRow({
  climber,
  isSaving,
  isDeleting,
  showDeleteConfirm,
  editLocked,
  error,
  onShowStats,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: ClimberRowProps) {
  return (
    <tr className="border-b border-border hover:bg-muted/50">
      <td className="p-2 text-foreground">{climber.id}</td>
      <td className="p-2">
        <span className="text-foreground">{climber.username}</span>
      </td>
      <td className="p-2">
        <span className="text-foreground">{climber.email}</span>
      </td>
      <td className="p-2">
        <span className="text-foreground">{climber.firstname}</span>
      </td>
      <td className="p-2">
        <span className="text-foreground">{climber.lastname}</span>
      </td>
      <td className="p-2">
        <span className="text-foreground">{climber.club}</span>
      </td>
      <td className="p-2">
        <span className="text-muted-foreground">••••••••</span>
      </td>
      <td className="p-2">
        <span className="text-foreground">{climber.user_scope}</span>
      </td>
      <td className="p-2 text-foreground">{formatDate(climber.created_at)}</td>

      <td className="p-2">
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => onShowStats(climber)}
            disabled={isSaving || isDeleting}
            className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded disabled:opacity-50"
            size="1"
            title="Visa statistik"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>

          <Button
            onClick={() => onEdit(climber)}
            aria-label={`Redigera ${climber.username}`}
            disabled={isSaving || isDeleting || editLocked}
            className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-1 rounded disabled:opacity-50"
            size="1"
          >
            <Pencil className="w-4 h-4" />
          </Button>

          {showDeleteConfirm ? (
            <>
              <Button
                onClick={() => onConfirmDelete(climber.id)}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-2 py-1 rounded text-xs disabled:opacity-50"
                size="1"
              >
                {isDeleting ? <Spinner size="1" /> : "Bekräfta"}
              </Button>

              <Button
                onClick={onCancelDelete}
                disabled={isDeleting}
                className="bg-secondary hover:bg-accent text-secondary-foreground px-2 py-1 rounded text-xs disabled:opacity-50"
                size="1"
              >
                Avbryt
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onRequestDelete(climber.id)}
              disabled={isSaving || isDeleting || editLocked}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1 rounded disabled:opacity-50"
              size="1"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <RowError message={error} />
      </td>
    </tr>
  );
}
