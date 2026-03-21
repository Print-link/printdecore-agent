import { useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi, type BillingInfo, type Plan } from "../services/api/billing";
import { useCallback } from "react";

const BILLING_KEY = ["billing", "me"];

/**
 * Check if a plan feature is allowed.
 * Caches billing info for 30 seconds to stay responsive to plan changes.
 */
export function usePlanFeature(
  feature: string
): { allowed: boolean; loading: boolean } {
  const { data, isLoading } = useQuery<BillingInfo>({
    queryKey: BILLING_KEY,
    queryFn: () => billingApi.getMyBilling(),
    staleTime: 30_000, // 30 seconds — responsive to downgrades
    retry: false,
  });

  if (isLoading || !data) return { allowed: false, loading: isLoading };

  const value = (data.plan as any)?.[feature];
  return { allowed: value === true || value === null, loading: false };
}

/**
 * Get the full current plan object.
 * Use this for sidebar gating and feature checks that need multiple fields.
 */
export function useCurrentPlan(): {
  plan: Plan | null;
  loading: boolean;
  invalidate: () => void;
} {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<BillingInfo>({
    queryKey: BILLING_KEY,
    queryFn: () => billingApi.getMyBilling(),
    staleTime: 30_000,
    retry: false,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: BILLING_KEY });
  }, [queryClient]);

  return {
    plan: data?.plan ?? null,
    loading: isLoading,
    invalidate,
  };
}
