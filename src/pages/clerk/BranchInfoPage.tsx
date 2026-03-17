import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { apiService } from "../../services/api";
import { Spinner } from "../../components/icons";
import BranchInfoSettings from "./settings/BranchInfoSettings";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";

export default function BranchInfoPage() {
  const { user } = useAuthStore();
  const { selectedBranch, selectBranch } = useBranchStore();
  const t = useThemeClasses();
  const { hasPermission } = usePermissions();

  const branchId = selectedBranch?.id || user?.branch_id || null;

  const { data: branch, isLoading } = useQuery({
    queryKey: ["branchInfo", branchId],
    queryFn: () => apiService.getBranchById(branchId!),
    enabled: !!branchId,
    staleTime: 30000,
  });

  useEffect(() => {
    if (branch) {
      selectBranch(branch);
    }
  }, [branch, selectBranch]);

  if (!hasPermission(PERMISSIONS.BRANCH_VIEW)) {
    return (
      <div className={cn("p-6 text-center", t.textSecondary)}>
        Access denied. You need branch view permissions.
      </div>
    );
  }

  if (!branchId) {
    return (
      <div className={cn("p-6 text-center", t.textSecondary)}>
        No branch selected. Please select a branch to configure.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  return <BranchInfoSettings />;
}
