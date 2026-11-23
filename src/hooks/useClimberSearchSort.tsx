import { useMemo, useState } from "react";
import { ClimberResponse } from "@/types";

export type SortField = "firstname" | "lastname";
export type SortDirection = "asc" | "desc";

/** Free-text search plus first/last name sorting for the admin climber list. */
export function useClimberSearchSort(climbers: ClimberResponse[]) {
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
      ? climbers.filter((climber) =>
          [climber.username, climber.firstname, climber.lastname, climber.email, climber.club]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(query))
        )
      : climbers;

    if (!sortField) return filtered;

    const sorted = [...filtered].sort((a, b) =>
      (a[sortField] ?? "").localeCompare(b[sortField] ?? "", "sv", { sensitivity: "base" })
    );
    if (sortDirection === "desc") sorted.reverse();
    return sorted;
  }, [climbers, searchQuery, sortField, sortDirection]);

  return { searchQuery, setSearchQuery, sortField, sortDirection, handleSort, displayedClimbers };
}
