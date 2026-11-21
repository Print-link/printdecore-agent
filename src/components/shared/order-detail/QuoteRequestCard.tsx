import { useState } from 'react';
import { MessageCircle, Receipt, Send, XCircle } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
import type { OrderStatus, QuoteRequest } from '../../../types';
import { Button, Card } from '../../ui';
import { toOrderFiles } from '../../../lib/files';
import { FileList } from './FileList';

interface QuoteRequestCardProps {
	request: QuoteRequest;
	status: OrderStatus;
	isSending: boolean;
	onSendQuote: (amount: number) => void;
	onDecline?: () => void;
}

/** Statuses where the price can still be set or changed — before the customer pays */
const QUOTABLE: OrderStatus[] = ['PENDING', 'QUOTED'];

/**
 * A job the customer described (usually with the print assistant) instead of
 * picking a listed product: read what they need, then send a price — or
 * decline it. The customer pays the price you send from their order.
 */
export function QuoteRequestCard({ request, status, isSending, onSendQuote, onDecline }: QuoteRequestCardProps) {
	const t = useThemeClasses();
	const sent = request.quotation?.status === 'SENT' || status === 'QUOTED';
	// The customer turned the last price down and is waiting for a new one
	const declined = !sent && (request.quotation?.status === 'REJECTED' || !!request.priceDeclined);
	// You type your own price; the customer pays it plus Printdecore's commission
	const [amount, setAmount] = useState(() =>
		(sent || declined) && request.quotation?.shopPrice ? String(request.quotation.shopPrice) : '',
	);
	const value = Number(amount);
	const valid = Number.isFinite(value) && value > 0;
	const rate = request.commissionRate ?? 0;
	const commission = valid ? Math.round(value * rate) / 100 : 0;
	const customerPays = valid ? Math.round((value + commission) * 100) / 100 : 0;
	const ghs = (n: number) => `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	const canQuote = request.canQuote && !!request.quotation && QUOTABLE.includes(status);
	const lines = (request.details ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

	return (
		<Card padding="sm" className="p-3 sm:p-4">
			<p className={`text-xs font-semibold uppercase tracking-wide ${t.textSecondary}`}>Quote request · {request.requestNumber}</p>
			<h3 className={`mt-1 text-lg font-bold ${t.text}`}>
				{request.quantity ? `${request.quantity.toLocaleString()} × ` : ''}
				{request.title}
			</h3>

			{lines.length > 0 && (
				<ul className={`mt-2 space-y-1 text-sm list-disc pl-5 ${t.text}`}>
					{lines.map((line, i) => (
						<li key={i}>{line}</li>
					))}
				</ul>
			)}

			{request.attachments.length > 0 && (
				<div className="mt-3">
					<FileList files={toOrderFiles(request.attachments)} title="Customer's files" />
				</div>
			)}

			{declined && QUOTABLE.includes(status) && (
				<div
					role="alert"
					className={`relative mt-4 overflow-hidden rounded-lg border p-3 pl-4 ${
						t.isDark ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'
					}`}
				>
					<span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-red-500" />
					<p className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${t.isDark ? 'text-red-300' : 'text-red-600'}`}>
						<XCircle size={14} /> Price declined
						{request.priceDeclined?.at && (
							<span className={`font-medium normal-case tracking-normal ${t.textSecondary}`}>
								· {new Date(request.priceDeclined.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
							</span>
						)}
					</p>
					<p className={`mt-1 text-sm font-semibold ${t.text}`}>
						The customer declined {request.quotation?.shopPrice !== undefined ? `your price of ${ghs(request.quotation.shopPrice)}` : 'your price'}
					</p>
					{request.priceDeclined?.reason ? (
						<p className={`mt-1.5 flex items-start gap-1.5 text-sm ${t.text}`}>
							<MessageCircle size={15} className={`mt-0.5 shrink-0 ${t.textSecondary}`} />
							<span>“{request.priceDeclined.reason}”</span>
						</p>
					) : (
						<p className={`mt-1 text-xs ${t.textSecondary}`}>They didn't say why — a message can help before you re-price.</p>
					)}
					{canQuote && <p className={`mt-1.5 text-xs ${t.textSecondary}`}>Send a new price below, or decline the request.</p>}
				</div>
			)}

			{canQuote ? (
				<div className={`mt-4 p-3 rounded-lg ${t.isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
					<label htmlFor={`quote-${request.id}`} className={`block text-sm font-semibold ${t.text}`}>
						{sent ? 'Your price (sent — you can change it until they pay)' : declined ? 'Your new price for the whole job' : 'Your price for the whole job'}
					</label>
					<div className="mt-2 flex items-center gap-2">
						<span className={`text-sm font-semibold ${t.textSecondary}`}>GHS</span>
						<input
							id={`quote-${request.id}`}
							type="number"
							inputMode="decimal"
							min="0"
							step="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							className={`flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm ${
								t.isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
							} focus:outline-none focus:ring-2 focus:ring-amber-400`}
						/>
					</div>
					{valid && (
						<div className={`mt-3 rounded-lg px-3 py-2 text-sm space-y-0.5 ${t.isDark ? 'bg-gray-900/60' : 'bg-white'}`}>
							<div className={`flex justify-between ${t.textSecondary}`}>
								<span>You're paid</span>
								<span className="tabular-nums">{ghs(value)}</span>
							</div>
							{rate > 0 && (
								<div className={`flex justify-between ${t.textSecondary}`}>
									<span>Platform service fee ({rate}%)</span>
									<span className="tabular-nums">+ {ghs(commission)}</span>
								</div>
							)}
							<div className={`flex justify-between font-semibold ${t.text}`}>
								<span>Customer pays</span>
								<span className="tabular-nums">{ghs(customerPays)}</span>
							</div>
						</div>
					)}
					<p className={`mt-2 text-xs ${t.textSecondary}`}>
						The customer gets it straight away and pays from their order. Include design, delivery and anything else in your price.
					</p>
					<div className="mt-3 flex gap-2">
						{onDecline && (
							<Button variant="secondary" onClick={onDecline} disabled={isSending} icon={XCircle}>
								Decline
							</Button>
						)}
						<Button
							onClick={() => valid && onSendQuote(Math.round(value * 100) / 100)}
							disabled={!valid || isSending}
							icon={Send}
							className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
						>
							{isSending ? 'Sending…' : sent ? 'Update price' : declined ? 'Send new price' : 'Send price'}
						</Button>
					</div>
				</div>
			) : (
				request.quotation?.amount !== undefined && (
					<p className={`mt-3 flex items-center gap-1.5 text-sm ${t.text}`}>
						<Receipt size={16} />
						{request.quotation.shopPrice !== undefined
								? `Your price ${ghs(request.quotation.shopPrice)} · customer pays ${ghs(request.quotation.amount)}`
								: `Price sent: ${ghs(request.quotation.amount)}`}
					</p>
				)
			)}
			{!request.canQuote && QUOTABLE.includes(status) && (
				<p className={`mt-3 text-xs ${t.textSecondary}`}>Printdecore is preparing the price for this request.</p>
			)}
		</Card>
	);
}
