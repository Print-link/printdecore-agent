import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./toaster.css";

/**
 * Printdecore's toast, shared look across the customer, vendor and admin
 * apps: a dark card that springs in from the top, a tinted icon tile whose
 * mark draws itself, a hairline timer, and a stacked deck that fans out on
 * hover. This file only draws; whoever renders it owns the list and timers.
 */
export type StackToastType = "success" | "error" | "warning" | "info" | "loading" | "default";

export interface StackToast {
	id: string;
	type: StackToastType;
	message: ReactNode;
	title?: ReactNode;
	/** ms; 0 or Infinity = stays until dismissed */
	duration: number;
	/** false while it plays its exit */
	visible: boolean;
	/** Replaces the drawn mark, e.g. an emoji */
	icon?: ReactNode;
}

const MARKS: Record<string, ReactNode> = {
	success: <path d="M6.5 12.5l3.5 3.5 7.5-8" />,
	error: (
		<>
			<path d="M8 8l8 8" />
			<path d="M16 8l-8 8" />
		</>
	),
	warning: (
		<>
			<path d="M12 6.5v7" />
			<path d="M12 17.5v.01" />
		</>
	),
	info: (
		<>
			<path d="M12 11v6" />
			<path d="M12 7.5v.01" />
		</>
	),
	default: <path d="M7 12.5h10" />,
};

const Icon = ({ type, icon }: { type: StackToastType; icon?: ReactNode }) => (
	<span className={`pd-toast-icon pd-toast-icon--${type}`} aria-hidden>
		{icon ? (
			<span className="pd-toast-emoji">{icon}</span>
		) : type === "loading" ? (
			<span className="pd-toast-spinner" />
		) : (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
				{MARKS[type] ?? MARKS.default}
			</svg>
		)}
	</span>
);

const PEEK = 10; // px each card behind shows below the front one
const GAP = 8; // px between cards when fanned out
const DEPTH = 3; // cards shown in the deck

export function ToastStack({
	toasts,
	onDismiss,
	onHoverChange,
}: {
	/** Newest first */
	toasts: StackToast[];
	onDismiss: (id: string) => void;
	/** Pause timers while the pointer is over the stack */
	onHoverChange?: (hovering: boolean) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const [heights, setHeights] = useState<Record<string, number>>({});
	const setHeight = useCallback((id: string, h: number) => setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h })), []);

	const hover = (on: boolean) => {
		setExpanded(on);
		onHoverChange?.(on);
	};

	const shown = toasts.filter((t) => t.visible);
	const heightOf = (id?: string) => (id && heights[id]) || 64;
	// Fanned out, each card sits below the ones in front of it
	const offsets = shown.reduce<number[]>((acc, _t, i) => [...acc, i === 0 ? 0 : acc[i - 1] + heightOf(shown[i - 1].id) + GAP], []);
	const layout = toasts.map((t) => {
		const i = shown.indexOf(t);
		const depth = Math.min(Math.max(i, 0), DEPTH);
		const pos = expanded
			? { y: i < 0 ? 0 : offsets[i], s: 1, o: i < 0 ? 0 : 1 }
			: { y: depth * PEEK, s: 1 - depth * 0.05, o: i > DEPTH ? 0 : 1 };
		return { t, i, ...pos };
	});
	const height =
		shown.length === 0
			? 0
			: expanded
				? offsets[shown.length - 1] + heightOf(shown[shown.length - 1].id)
				: heightOf(shown[0].id) + Math.min(shown.length - 1, DEPTH) * PEEK;

	if (toasts.length === 0) return null;

	return (
		<section
			className="pd-toaster"
			aria-live="polite"
			aria-label="Notifications"
			style={{ height }}
			onMouseEnter={() => hover(true)}
			onMouseLeave={() => hover(false)}
			onFocus={() => hover(true)}
			onBlur={() => hover(false)}
		>
			{layout.map(({ t, i, y, s, o }) => (
				<div
					key={t.id}
					className="pd-toast-slot"
					data-behind={!expanded && i > 0 ? "true" : undefined}
					style={{ transform: `translate3d(0, ${y}px, 0) scale(${s})`, opacity: o, zIndex: 100 - Math.max(i, 0) }}
				>
					<Card toast={t} paused={expanded} onDismiss={() => onDismiss(t.id)} onHeight={(h) => setHeight(t.id, h)} />
				</div>
			))}
		</section>
	);
}

function Card({ toast: t, paused, onDismiss, onHeight }: { toast: StackToast; paused: boolean; onDismiss: () => void; onHeight: (h: number) => void }) {
	const ref = useRef<HTMLDivElement>(null);
	const drag = useRef<{ y0: number; dy: number } | null>(null);
	const [dy, setDy] = useState(0);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		onHeight(el.offsetHeight);
		const ro = new ResizeObserver(() => onHeight(el.offsetHeight));
		ro.observe(el);
		return () => ro.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const timed = t.duration > 0 && Number.isFinite(t.duration) && t.type !== "loading";

	return (
		<div
			ref={ref}
			role={t.type === "error" ? "alert" : "status"}
			className={`pd-toast ${t.visible ? "pd-toast-in" : "pd-toast-out"}`}
			style={dy ? { translate: `0 ${dy}px`, opacity: 1 + dy / 120 } : undefined}
			// Swipe up to dismiss
			onPointerDown={(e) => {
				if ((e.target as HTMLElement).closest("button")) return;
				drag.current = { y0: e.clientY, dy: 0 };
				(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
			}}
			onPointerMove={(e) => {
				if (!drag.current) return;
				drag.current.dy = Math.min(0, e.clientY - drag.current.y0);
				setDy(drag.current.dy);
			}}
			onPointerUp={() => {
				if (drag.current && drag.current.dy < -36) onDismiss();
				drag.current = null;
				setDy(0);
			}}
			onPointerCancel={() => {
				drag.current = null;
				setDy(0);
			}}
		>
			<Icon type={t.type} icon={t.icon} />
			<div className="pd-toast-text">
				{t.title && <p className="pd-toast-title">{t.title}</p>}
				<div className="pd-toast-message">{t.message}</div>
			</div>
			<button type="button" className="pd-toast-close" onClick={onDismiss} aria-label="Dismiss">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
					<path d="M7 7l10 10M17 7L7 17" />
				</svg>
			</button>
			{timed && (
				<span className="pd-toast-timer" aria-hidden>
					<span
						className={`pd-toast-timer-bar pd-toast-timer-bar--${t.type}`}
						style={{ animationDuration: `${t.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
					/>
				</span>
			)}
		</div>
	);
}
