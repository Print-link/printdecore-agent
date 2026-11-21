import type { ClerkOrder, OrderStatus } from '../types';

/**
 * A shop moves a paid order through three steps (the server allows exactly these):
 *   1. Accept & start   PAID → IN_PROGRESS, with a ready-by time
 *   2. Ready            → READY_FOR_PICKUP, or OUT_FOR_DELIVERY for a delivery
 *   3. Handed over      → COMPLETED (collected or delivered)
 * RECEIVED, PRINTING, QUALITY_CHECK and DELIVERED are from the older, longer
 * flow; orders still in them carry on from the matching step.
 */
export type ShopStep = 0 | 1 | 2 | 3;

const delivery = (order: Pick<ClerkOrder, 'fulfilmentType'>) => order.fulfilmentType === 'delivery';

/** Steps done so far: 0 = waiting to be accepted, 3 = handed over */
export function shopStep(status: OrderStatus): ShopStep | null {
	switch (status) {
		case 'PAID':
			return 0;
		case 'RECEIVED':
		case 'IN_PROGRESS':
		case 'PRINTING':
		case 'QUALITY_CHECK':
			return 1;
		case 'READY_FOR_PICKUP':
		case 'OUT_FOR_DELIVERY':
		case 'DELIVERED':
			return 2;
		case 'COMPLETED':
			return 3;
		default:
			return null; // before payment, or cancelled
	}
}

/** The three steps' names, worded for how this customer gets their order */
export function stepLabels(order: Pick<ClerkOrder, 'fulfilmentType'>): [string, string, string] {
	return delivery(order)
		? ['Accepted & in production', 'Out for delivery', 'Delivered']
		: ['Accepted & in production', 'Ready for pickup', 'Collected'];
}

export type NextAction =
	| { kind: 'accept'; label: string }
	| { kind: 'advance'; next: OrderStatus; label: string }
	| { kind: 'complete'; label: string };

/** The one thing to do next on this order, if anything */
export function nextAction(order: Pick<ClerkOrder, 'status' | 'fulfilmentType'>): NextAction | null {
	switch (shopStep(order.status)) {
		case 0:
			return { kind: 'accept', label: 'Accept & start' };
		case 1:
			return delivery(order)
				? { kind: 'advance', next: 'OUT_FOR_DELIVERY', label: 'Send out for delivery' }
				: { kind: 'advance', next: 'READY_FOR_PICKUP', label: 'Ready for pickup' };
		case 2:
			// An older delivery order marked ready at the shop still has to go out
			if (order.status === 'READY_FOR_PICKUP' && delivery(order)) {
				return { kind: 'advance', next: 'OUT_FOR_DELIVERY', label: 'Send out for delivery' };
			}
			return { kind: 'complete', label: delivery(order) ? 'Mark delivered' : 'Mark collected' };
		default:
			return null;
	}
}

/** What the customer sees in their app right now — so staff know what they've been told */
export function customerSees(order: Pick<ClerkOrder, 'status' | 'fulfilmentType'>): string | null {
	switch (shopStep(order.status)) {
		case 0:
			return 'Paid — waiting for you to accept';
		case 1:
			return 'Being made, with your ready-by time';
		case 2:
			return order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED'
				? 'On its way to them'
				: 'Ready to collect from your shop';
		case 3:
			return delivery(order) ? 'Delivered' : 'Collected';
		default:
			return null;
	}
}

/** The toast after a step, saying the customer has been told */
export function stepDoneMessage(next: OrderStatus): string {
	switch (next) {
		case 'READY_FOR_PICKUP':
			return "Marked ready for pickup — the customer has been told they can collect it.";
		case 'OUT_FOR_DELIVERY':
			return 'Marked out for delivery — the customer has been told it’s on its way.';
		default:
			return `Order is now ${next.replace(/_/g, ' ').toLowerCase()}.`;
	}
}
