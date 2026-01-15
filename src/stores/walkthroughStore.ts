import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WalkthroughStep = 
  | 'welcome'
  | 'sidebar-branches'
  | 'branches-create'
  | 'create-branch-form'
  | 'completed';

interface WalkthroughState {
  currentStep: WalkthroughStep | null;
  isActive: boolean;
  hasSeenWalkthrough: boolean;
}

interface WalkthroughActions {
  startWalkthrough: () => void;
  nextStep: () => void;
  skipWalkthrough: () => void;
  setStep: (step: WalkthroughStep) => void;
  resetWalkthrough: () => void;
}

const STEPS: WalkthroughStep[] = [
  'welcome',
  'sidebar-branches',
  'branches-create',
  'create-branch-form',
  'completed'
];

export const useWalkthroughStore = create<WalkthroughState & WalkthroughActions>()(
  persist(
    (set, get) => ({
      currentStep: null,
      isActive: false,
      hasSeenWalkthrough: false,

      startWalkthrough: () => {
        if (!get().hasSeenWalkthrough) {
          set({ currentStep: 'welcome', isActive: true });
        }
      },

      nextStep: () => {
        const { currentStep } = get();
        if (!currentStep) return;

        const currentIndex = STEPS.indexOf(currentStep);
        if (currentIndex < STEPS.length - 1) {
          const nextStep = STEPS[currentIndex + 1];
          if (nextStep === 'completed') {
            set({ currentStep: null, isActive: false, hasSeenWalkthrough: true });
          } else {
            set({ currentStep: nextStep });
          }
        }
      },

      skipWalkthrough: () => {
        set({ currentStep: null, isActive: false, hasSeenWalkthrough: true });
      },

      setStep: (step: WalkthroughStep) => {
        set({ currentStep: step, isActive: true });
      },

      resetWalkthrough: () => {
        set({ currentStep: null, isActive: false, hasSeenWalkthrough: false });
      }
    }),
    {
      name: 'walkthrough-storage',
      partialize: (state) => ({
        hasSeenWalkthrough: state.hasSeenWalkthrough,
      }),
    }
  )
);
