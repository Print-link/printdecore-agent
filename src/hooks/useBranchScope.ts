import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import { useBranchStore } from "../stores/branchStore";
import { useWhatsAppStore } from "../stores/whatsappStore";
import { usePermissions } from "./usePermissions";
import { apiService } from "../services/api";
import type { Branch } from "../types";

/** Pages that work on one branch at a time; "All branches" asks for one first */
export const BRANCH_ONLY_PATHS = [
  "/app/orders",
  "/app/jobs",
  "/app/pricing",
  "/app/services",
  "/app/reports",
  "/app/access-control",
  "/app/branch-info",
];

export const isBranchOnlyPath = (pathname: string) =>
  BRANCH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

/** The manager's branches (shares the cache the branch pages invalidate) */
export function useMyBranches() {
  const { user } = useAuthStore();
  const { isManager } = usePermissions();
  return useQuery({
    queryKey: ["branches", user?.id],
    queryFn: () => apiService.getAllBranches(user!.id),
    enabled: !!user?.id && isManager,
    staleTime: 30000,
  });
}

/**
 * Moves the app to one branch, or to all of them (null). WhatsApp is linked to
 * one branch, so it disconnects first and the manager scans again.
 */
export function useSwitchBranch() {
  const { selectedBranch, selectBranch, clearBranch, setError } = useBranchStore();
  const { disconnect, isConnected } = useWhatsAppStore();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const switchTo = useCallback(
    async (branch: Pick<Branch, "id"> | null) => {
      if ((branch?.id ?? null) === (selectedBranch?.id ?? null)) return;
      setSwitchingTo(branch?.id ?? "all");
      setError(null);
      try {
        if (isConnected) await disconnect();
        if (branch) selectBranch(await apiService.getBranchById(branch.id));
        else clearBranch();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Couldn't switch branch");
      } finally {
        setSwitchingTo(null);
      }
    },
    [selectedBranch?.id, isConnected, disconnect, selectBranch, clearBranch, setError],
  );

  return { switchTo, switchingTo };
}

/**
 * A shop with one branch always works in it, and a remembered branch the
 * manager no longer has is dropped.
 */
export function useAutoScope() {
  const { data: branches } = useMyBranches();
  const { selectedBranch, clearBranch } = useBranchStore();
  const { switchTo } = useSwitchBranch();
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (!branches) return;
    if (selectedBranch && !branches.some((b) => b.id === selectedBranch.id)) clearBranch();
    else if (branches.length === 1 && selectedBranch?.id !== branches[0].id && tried.current !== branches[0].id) {
      tried.current = branches[0].id; // once, so a failed load doesn't retry forever
      switchTo(branches[0]);
    }
  }, [branches, selectedBranch, clearBranch, switchTo]);
}
