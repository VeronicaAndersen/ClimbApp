import { createCompetition } from "@/services/api";
import { CompetitionRequest } from "@/types";
import { useMutation } from "./useMutation";

interface UseCreateCompetitionResult {
  loading: boolean;
  error: string | null;
  success: boolean;
  createCompetition: (data: CompetitionRequest) => Promise<boolean>;
  reset: () => void;
}

export function useCreateCompetition(): UseCreateCompetitionResult {
  const { mutate, isLoading, error, success, reset } = useMutation({
    mutationFn: createCompetition,
    errorMessage: "Ett fel uppstod vid skapandet av tävlingen.",
  });

  return {
    loading: isLoading,
    error,
    success,
    createCompetition: mutate,
    reset,
  };
}
