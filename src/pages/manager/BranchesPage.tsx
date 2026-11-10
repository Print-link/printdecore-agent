import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { apiService } from "../../services/api";
import { BranchesHeader, BranchesList } from "./branches/components";
import { BranchTransitionOverlay } from "../../components/shared/BranchTransitionOverlay";
import { BranchesListSkeleton } from "../../components/ui/skeletons";
import type { Branch } from "../../types";
import {
  useDeletBranch,
  useGetBranches,
} from "../../hooks/queries/useBranches";
import AccessDeniedFallback from "../../components/ui/access-denied-fallback";
import { AnimatedPopup } from "../../components/ui/prompt";

export default function BranchesPage() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { selectBranch, setLoading, setError } = useBranchStore();
  const navigate = useNavigate();
  // const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [transitionBranch, setTransitionBranch] = useState<Branch | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const { branches, branchesError, isLoading } = useGetBranches();
  const deletBranch = useDeletBranch();

  const handleBranchClick = async (branch: Branch) => {
    try {
      setTransitionBranch(branch);
      setShowTransition(true);
      setLoading(true);
      setError(null);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const branchDetails = await apiService.getBranchById(branch.id);
      selectBranch(branchDetails);

      await new Promise((resolve) => setTimeout(resolve, 500));
      navigate("/app/home");

      setTimeout(() => {
        setShowTransition(false);
        setTransitionBranch(null);
        setLoading(false);
      }, 600);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load branch details";
      setError(errorMessage);
      setShowTransition(false);
      setTransitionBranch(null);
      setLoading(false);
    }
  };

  const handleCreateBranch = () => {
    navigate("/app/branches/create");
  };

  const handleEditBranch = (branch: Branch) => {
    navigate(`/app/branches/edit/${branch.id}`);
  };

  const handleDeleteBranch = useCallback((branch: Branch) => {
    setBranchToDelete(branch);
  }, []);

  const confirmDeleteBranch = useCallback(() => {
    if (!branchToDelete) return;
    setError(null);
    deletBranch.mutate(branchToDelete.id, {
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete branch";
        setError(errorMessage);
      },
    });
    setBranchToDelete(null);
  }, [branchToDelete, deletBranch, setError]);

  if (user?.role !== "manager" || !user?.id) {
    return <AccessDeniedFallback />;
  }

  if (isLoading || (deletBranch.isPending && branches.length === 0)) {
    return (
      <div className="p-3 h-full overflow-auto">
        <BranchesListSkeleton />
      </div>
    );
  }

  return (
    <>
      <BranchTransitionOverlay
        branch={transitionBranch}
        isVisible={showTransition}
      />
      <div className="p-3 h-full overflow-auto">
        <BranchesHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreateBranch={handleCreateBranch}
        />
        {branchesError && (
          <div
            className={`p-3 rounded-md border mb-3 ${
              theme === "dark"
                ? "bg-red-900/20 border-red-500 text-red-400"
                : "bg-red-50 border-red-500 text-red-600"
            }`}
          >
            Error loading branches:{" "}
            {branchesError instanceof Error
              ? branchesError.message
              : "Unknown error"}
          </div>
        )}
        <BranchesList
          branches={branches}
          viewMode={viewMode}
          onBranchClick={handleBranchClick}
          onEditBranch={handleEditBranch}
          onDeleteBranch={handleDeleteBranch}
        />
      </div>
      <AnimatedPopup
        visible={!!branchToDelete}
        onDismiss={() => setBranchToDelete(null)}
        variant="warning"
        title="Delete Branch"
        description={`Are you sure you want to delete "${branchToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDeleteBranch}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </>
  );
}
