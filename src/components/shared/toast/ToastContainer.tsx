import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { ToastStack, type StackToast } from "./ToastStack";

const EXIT_MS = 240;

/**
 * Renders the app's toasts (useToast().success/error/...) as the shared
 * Printdecore stack. Owns the timers: they pause while the stack is hovered
 * and resume with the time that was left.
 */
export function ToastContainer() {
	const { toasts, removeToast } = useToast();
	const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
	const [paused, setPaused] = useState(false);
	const remaining = useRef(new Map<string, number>());

	const dismiss = useCallback(
		(id: string) => {
			setLeaving((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
			window.setTimeout(() => {
				removeToast(id);
				remaining.current.delete(id);
				setLeaving((prev) => {
					const next = new Set(prev);
					next.delete(id);
					return next;
				});
			}, EXIT_MS);
		},
		[removeToast]
	);

	useEffect(() => {
		if (paused) return;
		const store = remaining.current;
		const running = toasts
			.filter((t) => t.duration && t.duration > 0 && !leaving.has(t.id))
			.map((t) => {
				const left = store.get(t.id) ?? t.duration!;
				return { id: t.id, left, start: Date.now(), handle: window.setTimeout(() => dismiss(t.id), left) };
			});
		return () =>
			running.forEach(({ id, left, start, handle }) => {
				window.clearTimeout(handle);
				store.set(id, Math.max(0, left - (Date.now() - start)));
			});
	}, [toasts, leaving, paused, dismiss]);

	const items: StackToast[] = [...toasts].reverse().map((t) => ({
		id: t.id,
		type: t.type,
		title: t.title,
		message: t.message,
		duration: t.duration ?? 0,
		visible: !leaving.has(t.id),
	}));

	return <ToastStack toasts={items} onDismiss={dismiss} onHoverChange={setPaused} />;
}
