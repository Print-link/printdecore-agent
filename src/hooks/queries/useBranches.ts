import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";

const useGetBranches = () => {
  const { user } = useAuthStore();
  const {
    data: branches = [],
    isLoading,
    error: branchesError,
  } = useQuery({
    queryKey: ["branches:get-branches", user?.id],
    queryFn: () => apiService.getAllBranches(user?.id as string),
    enabled: user?.role === "manager" && !!user?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return {
    branches,
    isLoading,
    branchesError,
  };
};

const useDeletBranch = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const deleteBranch = useMutation({
    mutationFn: (_branchId: string) => apiService.deleteBranch(_branchId),
    onMutate: () => {
      queryClient.invalidateQueries({
        queryKey: ["branches:get-branches", user?.id],
      });
    },
  });

  return deleteBranch;
};

export { useGetBranches, useDeletBranch };
