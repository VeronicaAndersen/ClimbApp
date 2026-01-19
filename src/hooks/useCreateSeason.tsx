import { createSeason } from "@/services/api";
import { SeasonRequest } from "@/types";
import { useMutation } from "./useMutation";

interface UseCreateSeasonResult {
  loading: boolean;
  error: string | null;
  success: boolean;
  createSeason: (data: SeasonRequest) => Promise<boolean>;
  reset: () => void;
}

export function useCreateSeason(): UseCreateSeasonResult {
  const { mutate, isLoading, error, success, reset } = useMutation({
    mutationFn: createSeason,
    errorMessage: "Ett fel uppstod vid skapandet av säsongen.",
  });

  return {
    loading: isLoading,
    error,
    success,
    createSeason: mutate,
    reset,
  };
}
