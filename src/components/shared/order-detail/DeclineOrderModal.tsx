import { useState } from 'react';
import { useThemeClasses } from '../../../lib/theme';
import { Button, Modal } from '../../ui';
import { XCircle } from '../../icons';

const REASONS = [
	"We're fully booked right now",
	"We don't have the material for this",
	"We can't do this kind of job",
	"The files can't be printed as sent",
];

interface DeclineOrderModalProps {
	open: boolean;
	isPending: boolean;
	onClose: () => void;
	onConfirm: (reason: string) => void;
	/** A quote request the customer hasn't paid for — nothing to refund */
	unpaid?: boolean;
}

/**
 * Turning down a marketplace order: pick a reason (or write one). The customer
 * sees it and gets a full refund, so the copy says exactly that.
 */
export function DeclineOrderModal({ open, isPending, onClose, onConfirm, unpaid = false }: DeclineOrderModalProps) {
	const t = useThemeClasses();
	const [choice, setChoice] = useState<string | null>(null);
	const [other, setOther] = useState('');

	const reason = choice === 'other' ? other.trim() : choice;
	const close = () => {
		if (isPending) return;
		setChoice(null);
		setOther('');
		onClose();
	};

	return (
		<Modal open={open} onClose={close} title={unpaid ? "Decline this request?" : "Decline this order?"} maxWidth="md">
			<p className={`text-sm mb-4 ${t.textSecondary}`}>
				{unpaid
					? "The customer sees the reason you choose. They haven't paid anything."
					: "The customer is refunded in full and sees the reason you choose."}
			</p>

			<div role="radiogroup" aria-label="Reason" className="space-y-2">
				{[...REASONS, 'other'].map((r) => {
					const active = choice === r;
					return (
						<button
							key={r}
							type="button"
							role="radio"
							aria-checked={active}
							onClick={() => setChoice(r)}
							className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border transition-colors ${
								active
									? 'border-red-500 bg-red-500/10 font-medium'
									: t.isDark
										? 'border-gray-700 hover:bg-gray-700/50'
										: 'border-gray-200 hover:bg-gray-50'
							} ${t.text}`}
						>
							{r === 'other' ? 'Something else…' : r}
						</button>
					);
				})}
			</div>

			{choice === 'other' && (
				<textarea
					autoFocus
					value={other}
					onChange={(e) => setOther(e.target.value)}
					rows={3}
					maxLength={300}
					placeholder="Tell the customer why"
					className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm ${
						t.isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
					}`}
				/>
			)}

			<div className="flex gap-2 mt-5">
				<Button variant="secondary" onClick={close} disabled={isPending} className="flex-1">
					{unpaid ? "Keep request" : "Keep order"}
				</Button>
				<Button
					onClick={() => reason && reason.length >= 3 && onConfirm(reason)}
					disabled={!reason || reason.length < 3 || isPending}
					loading={isPending}
					icon={isPending ? undefined : XCircle}
					className="flex-1 bg-red-500 hover:bg-red-600 text-white"
				>
					{unpaid ? "Decline" : "Decline & refund"}
				</Button>
			</div>
		</Modal>
	);
}
