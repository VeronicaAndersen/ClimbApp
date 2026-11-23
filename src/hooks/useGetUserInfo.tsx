import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MyInfoResponse, MessageProps } from "@/types";
import { getMyInfo } from "../services/api";

interface UseGetUserInfoResult {
  userInfo: MyInfoResponse | null;
  messageInfo: MessageProps | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const USER_INFO_ERROR_MESSAGE = "Ett fel uppstod vid hämtning av användarinformation.";

export default function useGetUserInfo(): UseGetUserInfoResult {
  const query = useQuery({
    // Per-user data: storeTokens resets every query on an account change.
    queryKey: ["myInfo"],
    queryFn: async () => (await getMyInfo()) ?? null,
    // The profile is edited from several places, so always refetch on mount
    // instead of trusting the global five-minute staleTime.
    staleTime: 0,
  });

  const { refetch, error } = query;
  const refetchInfo = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const messageInfo = useMemo<MessageProps | null>(
    () => (error ? { message: USER_INFO_ERROR_MESSAGE, color: "red" } : null),
    [error]
  );

  return {
    userInfo: query.data ?? null,
    messageInfo,
    loading: query.isPending,
    refetch: refetchInfo,
  };
}
