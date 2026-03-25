/**
 * Plan feature hooks — with billing removed, all features are always allowed.
 */

export function usePlanFeature(
  _feature: string
): { allowed: boolean; loading: boolean } {
  return { allowed: true, loading: false };
}

export function useCurrentPlan(): {
  plan: null;
  loading: boolean;
  invalidate: () => void;
} {
  return {
    plan: null,
    loading: false,
    invalidate: () => {},
  };
}

export function useTrial(): {
  trial: null;
  loading: boolean;
} {
  return {
    trial: null,
    loading: false,
  };
}
