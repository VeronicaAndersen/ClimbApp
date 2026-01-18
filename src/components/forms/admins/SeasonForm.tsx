import { SeasonRequest } from "@/types";
import { Button, Spinner } from "@radix-ui/themes";
import CalloutMessage from "../../user_feedback/CalloutMessage";
import { useCreateSeason } from "@/hooks/useCreateSeason";
import { useForm } from "@/hooks/useForm";

interface SeasonFormProps {
  onSeasonCreated?: () => void;
}

const initialSeasonData: SeasonRequest = { name: "", year: null };

export function SeasonForm({ onSeasonCreated }: SeasonFormProps = {}) {
  const { values: seasonData, handleChange, reset: resetForm } = useForm(initialSeasonData);
  const { loading, error, success, createSeason, reset: resetMutation } = useCreateSeason();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const success = await createSeason(seasonData);
    if (success) {
      resetForm();
      resetMutation();
      onSeasonCreated?.();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 h-fit flex flex-col bg-white/90 backdrop-blur p-4 rounded-lg shadow-md"
    >
      <h1 className="text-2xl font-semibold text-center mb-4">Skapa säsong</h1>
      {error && <CalloutMessage message={error} color="red" />}
      {success && <CalloutMessage message="Säsong skapad!" color="green" />}
      <label htmlFor="season_name" className="block mb-1">
        Namn
      </label>
      <input
        id="season_name"
        type="text"
        placeholder="Namn"
        value={seasonData.name}
        onChange={handleChange("name")}
        className="w-full p-2 rounded-lg border text-base"
        disabled={loading}
      />

      <label htmlFor="season_year" className="block mt-3 mb-1">
        År
      </label>
      <input
        id="season_year"
        type="number"
        placeholder="År"
        value={seasonData.year}
        onChange={handleChange("year")}
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
            <Spinner size="2" className="mr-2" /> Skapar säsong...
          </>
        ) : (
          "Skapa säsong"
        )}
      </Button>
    </form>
  );
}
