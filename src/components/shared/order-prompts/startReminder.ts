/**
 * When to ask "have you started on this order?" again. Kept per order in the
 * browser so a snooze survives page changes and reloads.
 */

/** First ask: this long after the order was received */
export const FIRST_ASK_MS = 5 * 60 * 1000;
/** "Not yet": ask again after this long */
export const SNOOZE_MS = 15 * 60 * 1000;

const key = (orderId: string) => `pd:start-reminder:${orderId}`;

export function nextAskAt(orderId: string, receivedAt: number): number {
	try {
		const saved = Number(localStorage.getItem(key(orderId)));
		if (saved > 0) return saved;
	} catch {
		// storage blocked — fall back to the received time
	}
	return receivedAt + FIRST_ASK_MS;
}

export function askAgainIn(orderId: string, ms: number) {
	try {
		localStorage.setItem(key(orderId), String(Date.now() + ms));
	} catch {
		// storage blocked — the reminder will simply come back on its own schedule
	}
}

export function forget(orderId: string) {
	try {
		localStorage.removeItem(key(orderId));
	} catch {
		// nothing to clean up
	}
}
