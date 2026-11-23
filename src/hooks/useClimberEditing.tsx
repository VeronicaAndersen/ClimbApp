import { useState } from "react";
import { deleteClimberById, updateClimberById } from "@/services/api";
import { ClimberResponse, ClimberUpdateRequest } from "@/types";
import {
  normalizeNewUsername,
  normalizeUsername,
  validateNewUsername,
} from "@/utils/inputValidation";
import { getUserFriendlyError } from "@/utils/errorMessages";

const emptyEditValues: ClimberUpdateRequest = {
  username: "",
  password: "",
  user_scope: "",
  email: "",
  firstname: "",
  lastname: "",
  club: "",
};

const OPTIONAL_TEXT_FIELDS = [
  "password",
  "user_scope",
  "email",
  "firstname",
  "lastname",
  "club",
] as const;

/**
 * Builds the update payload from the edited values. Only changed, non-blank
 * fields are sent. An unchanged username is neither validated nor sent:
 * legacy names may break the new-name rule. Returns an error message instead
 * when the new username is invalid.
 */
function buildUpdatePayload(
  editValues: ClimberUpdateRequest,
  currentUsername: string
): ClimberUpdateRequest | string {
  const payload: ClimberUpdateRequest = {};

  const usernameChanged =
    normalizeUsername(editValues.username ?? "") !== normalizeUsername(currentUsername);
  if (usernameChanged && editValues.username && editValues.username.trim()) {
    const usernameError = validateNewUsername(editValues.username);
    if (usernameError) return usernameError;
    payload.username = normalizeNewUsername(editValues.username);
  }

  for (const field of OPTIONAL_TEXT_FIELDS) {
    const value = editValues[field];
    if (value && value.trim()) {
      payload[field] = value.trim();
    }
  }

  return payload;
}

/** Inline edit, save and two-step delete state for the admin climber list. */
export function useClimberEditing(climbers: ClimberResponse[], refetch: () => Promise<void>) {
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

  const updateField = (field: keyof ClimberUpdateRequest, value: string) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (climberId: number) => {
    setSaving(climberId);
    setRowError(null);

    try {
      const currentClimber = climbers.find((c) => c.id === climberId);
      const payload = buildUpdatePayload(editValues, currentClimber?.username ?? "");
      if (typeof payload === "string") {
        setRowError({ id: climberId, message: payload });
        return;
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
      setRowError({ id: climberId, message: getUserFriendlyError(err) });
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
      setRowError({ id: climberId, message: getUserFriendlyError(err) });
    } finally {
      setDeleting(null);
    }
  };

  /** The error message for one row, or null. */
  const errorFor = (climberId: number) => (rowError?.id === climberId ? rowError.message : null);

  return {
    editingId,
    editValues,
    saving,
    deleting,
    deleteConfirm,
    errorFor,
    startEdit,
    cancelEdit: resetState,
    updateField,
    handleSave,
    handleDelete,
    requestDelete: (climberId: number) => setDeleteConfirm(climberId),
    cancelDelete: () => setDeleteConfirm(null),
  };
}
