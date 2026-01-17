import { CompetitionRequest } from "@/types";
import { Button, Spinner } from "@radix-ui/themes";
import CalloutMessage from "../user_feedback/CalloutMessage";
import { useCreateCompetition } from "@/hooks/useCreateCompetition";
import { useForm } from "@/hooks/useForm";

const initialCompetitionData: CompetitionRequest = {
  name: "",
  description: "",
  comp_type: "",
  comp_date: "",
  season_id: 0,
  round_no: 0,
};

interface CompetitionFormProps {
  onCompetitionCreated?: () => void;
}

export function CompetitionForm({ onCompetitionCreated }: CompetitionFormProps = {}) {
  const {
    values: competitionData,
    handleChange,
    reset: resetForm,
  } = useForm(initialCompetitionData);

  const {
    loading,
    error,
    success,
    createCompetition,
    reset: resetMutation,
  } = useCreateCompetition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createCompetition(competitionData);
    if (success) {
      resetForm();
      resetMutation();
      onCompetitionCreated?.();
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md"
      >
        <h1 className="text-2xl font-semibold text-center mb-4">Skapa tävling</h1>
        {error && <CalloutMessage message={error} color="red" />}
        {success && <CalloutMessage message="Tävling skapad!" color="green" />}
        <label htmlFor="competition_name" className="block mb-1">
          Namn
        </label>
        <input
          id="competition_name"
          type="text"
          placeholder="Namn"
          value={competitionData.name}
          onChange={handleChange("name")}
          className="w-full p-2 rounded-lg border text-base"
          disabled={loading}
        />

        <label htmlFor="competition_description" className="block mb-1">
          Beskrivning
        </label>
        <input
          id="competition_description"
          type="text"
          placeholder="Beskrivning"
          value={competitionData.description}
          onChange={handleChange("description")}
          className="w-full p-2 rounded-lg border text-base"
          disabled={loading}
        />

        <label htmlFor="competition_type" className="block mb-1">
          Typ
        </label>
        <input
          id="competition_type"
          type="text"
          placeholder="Typ"
          value={competitionData.comp_type}
          onChange={handleChange("comp_type")}
          className="w-full p-2 rounded-lg border text-base"
          disabled={loading}
        />

        <label htmlFor="competition_date" className="block mb-1">
          Datum
        </label>
        <input
          id="competition_date"
          type="date"
          placeholder="Datum"
          value={competitionData.comp_date}
          onChange={handleChange("comp_date")}
          className="w-full p-2 rounded-lg border text-base"
          disabled={loading}
        />

        <label htmlFor="season_id" className="block mb-1">
          Säsong ID
        </label>
        <input
          id="season_id"
          type="number"
          placeholder="Säsong ID"
          value={competitionData.season_id}
          onChange={handleChange("season_id")}
          className="w-full p-2 rounded-lg border text-base"
          disabled={loading}
        />

        <label htmlFor="round_no" className="block mb-1">
          Omgångsnummer
        </label>
        <input
          id="round_no"
          type="number"
          placeholder="Omgångsnummer"
          value={competitionData.round_no}
          onChange={handleChange("round_no")}
          className="w-full p-2 rounded-lg border text-base"
          disabled={loading}
        />

        <Button
          className="mt-4 w-full cursor-pointer rounded-full bg-[--secondary-color] hover:bg-[--secondary-color-hover] disabled:bg-[--secondary-color]/50 disabled:cursor-not-allowed flex items-center justify-center"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner size="2" className="mr-2" /> Skapar tävling...
            </>
          ) : (
            "Skapa tävling"
          )}
        </Button>
      </form>
    </>
  );
}
