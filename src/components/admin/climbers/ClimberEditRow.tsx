import { Spinner, Button } from "@radix-ui/themes";
import { Check, X } from "lucide-react";
import { ClimberResponse, ClimberUpdateRequest } from "@/types";
import { formatDate } from "./formatDate";
import { RowError } from "./RowError";

const USER_SCOPES = [
  { value: "climber", label: "Climber" },
  // { value: "setter", label: "Setter" },
  // { value: "analyst", label: "Analyst" },
  { value: "admin", label: "Admin" },
];

export interface ClimberEditRowProps {
  climber: ClimberResponse;
  values: ClimberUpdateRequest;
  isSaving: boolean;
  error: string | null;
  onFieldChange: (field: keyof ClimberUpdateRequest, value: string) => void;
  onSave: (climberId: number) => void;
  onCancel: () => void;
}

export function ClimberEditRow({
  climber,
  values,
  isSaving,
  error,
  onFieldChange,
  onSave,
  onCancel,
}: ClimberEditRowProps) {
  return (
    <tr className="border-b border-border hover:bg-muted/50">
      <td className="p-2 text-foreground">{climber.id}</td>

      <td className="p-2">
        <input
          type="text"
          value={values.username}
          onChange={(e) => onFieldChange("username", e.target.value)}
          className="input-base rounded px-2 py-1"
          disabled={isSaving}
          placeholder="Användarnamn"
          autoComplete="username"
        />
      </td>

      <td className="p-2">
        <input
          type="email"
          value={values.email}
          onChange={(e) => onFieldChange("email", e.target.value.trim().toLowerCase())}
          className="input-base rounded px-2 py-1"
          disabled={isSaving}
          placeholder="E-post"
        />
      </td>

      <td className="p-2">
        <input
          type="text"
          value={values.firstname}
          onChange={(e) => onFieldChange("firstname", e.target.value)}
          className="input-base rounded px-2 py-1"
          disabled={isSaving}
          placeholder="Förnamn"
        />
      </td>

      <td className="p-2">
        <input
          type="text"
          value={values.lastname}
          onChange={(e) => onFieldChange("lastname", e.target.value)}
          className="input-base rounded px-2 py-1"
          disabled={isSaving}
          placeholder="Efternamn"
        />
      </td>

      <td className="p-2">
        <input
          type="text"
          value={values.club}
          onChange={(e) => onFieldChange("club", e.target.value)}
          className="input-base rounded px-2 py-1"
          disabled={isSaving}
          placeholder="Klubb"
        />
      </td>

      <td className="p-2">
        <input
          type="password"
          value={values.password}
          onChange={(e) => onFieldChange("password", e.target.value)}
          className="input-base rounded px-2 py-1"
          disabled={isSaving}
          placeholder="Nytt lösenord (valfritt)"
          autoComplete="new-password"
        />
      </td>

      <td className="p-2">
        <select
          value={values.user_scope}
          onChange={(e) => onFieldChange("user_scope", e.target.value)}
          className="input-base p-2"
          disabled={isSaving}
        >
          {USER_SCOPES.map((scope) => (
            <option key={scope.value} value={scope.value}>
              {scope.label}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2 text-foreground">{formatDate(climber.created_at)}</td>

      <td className="p-2">
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => onSave(climber.id)}
            aria-label="Spara ändringar"
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
            size="1"
          >
            {isSaving ? <Spinner size="1" /> : <Check className="w-4 h-4" />}
          </Button>

          <Button
            onClick={onCancel}
            aria-label="Avbryt redigering"
            disabled={isSaving}
            className="bg-secondary hover:bg-accent text-secondary-foreground px-3 py-1 rounded disabled:opacity-50"
            size="1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <RowError message={error} />
      </td>
    </tr>
  );
}
