import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useThemeClasses } from '../../../lib/theme';

interface PromptModalProps {
	open: boolean;
	/** Escape and backdrop clicks call this; omit it to make the prompt need an answer */
	onDismiss?: () => void;
	/** Accent behind the icon */
	tone?: 'amber' | 'violet';
	icon: ReactNode;
	children: ReactNode;
	labelledBy: string;
}

const EXIT_MS = 180;

/**
 * The animated shell both order prompts share: the backdrop fades, the card
 * springs up, and rings pulse out from the icon to catch the eye. Stays
 * mounted for the exit animation, so closing never snaps.
 */
export function PromptModal({ open, onDismiss, tone = 'amber', icon, children, labelledBy }: PromptModalProps) {
	const t = useThemeClasses();
	const [mounted, setMounted] = useState(open);
	const [closing, setClosing] = useState(false);
	const cardRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) {
			setMounted(true);
			setClosing(false);
			return;
		}
		if (!mounted) return;
		setClosing(true);
		const timer = setTimeout(() => {
			setMounted(false);
			setClosing(false);
		}, EXIT_MS);
		return () => clearTimeout(timer);
	}, [open, mounted]);

	// Escape to dismiss; focus the card so keyboard users land in it
	useEffect(() => {
		if (!open) return;
		cardRef.current?.focus();
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss?.();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onDismiss]);

	if (!mounted) return null;

	const accent =
		tone === 'violet'
			? { ring: 'bg-violet-400/40', chip: t.isDark ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-700' }
			: { ring: 'bg-amber-400/40', chip: t.isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700' };

	return createPortal(
		<div
			className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] ${
				closing ? 'pd-backdrop-out' : 'pd-backdrop-in'
			}`}
			onClick={() => onDismiss?.()}
		>
			<div
				ref={cardRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={labelledBy}
				tabIndex={-1}
				onClick={(e) => e.stopPropagation()}
				className={`relative w-full max-w-md rounded-2xl shadow-2xl outline-none overflow-hidden ${
					t.isDark ? 'bg-gray-800 ring-1 ring-gray-700' : 'bg-white'
				} ${closing ? 'pd-pop-out' : 'pd-pop-in'}`}
			>
				<div className="px-6 pt-7 pb-6">
					<div className="relative mx-auto mb-4 h-14 w-14">
						<span className={`absolute inset-0 rounded-full ${accent.ring} pd-ring`} />
						<span className={`absolute inset-0 rounded-full ${accent.ring} pd-ring pd-ring-delay`} />
						<span className={`relative flex h-14 w-14 items-center justify-center rounded-full ${accent.chip}`}>
							<span className="pd-wiggle inline-flex">{icon}</span>
						</span>
					</div>
					{children}
				</div>
			</div>
		</div>,
		document.body
	);
}
