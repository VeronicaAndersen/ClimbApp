import { CompetitionResponse } from "@/types";

interface CompetitionSelectorProps {
  competitions: CompetitionResponse[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function CompetitionSelector({
  competitions,
  selectedId,
  onSelect,
}: CompetitionSelectorProps) {
  return (
    <div className="bg-card rounded-2xl shadow-soft p-5 mb-6 border border-border">
      <label
        htmlFor="competition-select"
        className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide"
      >
        Tävling
      </label>
      <select
        id="competition-select"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
        className="input-base p-2.5"
      >
        <option value="">Välj tävling...</option>
        {competitions.map((comp) => (
          <option key={comp.id} value={comp.id}>
            {comp.name} ({comp.comp_date})
          </option>
        ))}
      </select>
    </div>
  );
}
