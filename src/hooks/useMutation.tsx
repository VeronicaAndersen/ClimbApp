import { useState, useCallback } from "react";

export interface UseMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<boolean>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  message: string | null;
  data: TData | null;
  reset: () => void;
}

/**
 * Generic mutation hook for handling async operations with loading, error, and success states
 *
 * @example
 * const { mutate, isLoading, error } = useMutation({
 *   mutationFn: (data: CompetitionRequest) => createCompetition(data),
 *   successMessage: "Tävling skapad!",
 *   errorMessage: "Kunde inte skapa tävling"
 * });
 */
export function useMutation<TData = unknown, TVariables = void>({
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage,
}: UseMutationOptions<TData, TVariables>): UseMutationResult<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
    setMessage(null);
    setData(null);
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      setMessage(null);

      try {
        const result = await mutationFn(variables);
        setData(result);
        setSuccess(true);

        if (successMessage) {
          setMessage(successMessage);
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : errorMessage || "Ett fel uppstod";
        setError(errorMsg);
        setSuccess(false);

        if (onError && err instanceof Error) {
          onError(err);
        }

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, onSuccess, onError, successMessage, errorMessage]
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<boolean> => {
      try {
        await mutateAsync(variables);
        return true;
      } catch {
        return false;
      }
    },
    [mutateAsync]
  );

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
    success,
    message,
    data,
    reset,
  };
}
