import { create } from 'zustand';

/**
 * Coordinates the order prompts so only one is on screen: while the
 * review-a-new-order modal is open, the "have you started?" reminder waits.
 */
interface OrderPromptState {
	reviewOpen: boolean;
	setReviewOpen: (open: boolean) => void;
}

export const useOrderPromptStore = create<OrderPromptState>((set) => ({
	reviewOpen: false,
	setReviewOpen: (reviewOpen) => set({ reviewOpen }),
}));
