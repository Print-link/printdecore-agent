import { useState, type ReactNode } from 'react';
import { Check, Copy, Mail, MessageCircle, Phone, User } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
import type { ClerkOrder } from '../../../types';

interface ClientInfoCardProps {
	client: ClerkOrder['client'];
	/** marketplace: your own customer; managed: sent by Printdecore */
	channel?: ClerkOrder['channel'];
}

/** Avatar colours: the same customer always gets the same one */
const AVATAR_TONES = [
	'from-amber-400 to-orange-500',
	'from-sky-400 to-blue-600',
	'from-emerald-400 to-teal-600',
	'from-violet-400 to-purple-600',
	'from-rose-400 to-pink-600',
	'from-indigo-400 to-indigo-600',
	'from-cyan-400 to-sky-600',
	'from-lime-500 to-green-600',
];

const toneFor = (key: string) => {
	let h = 0;
	for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return AVATAR_TONES[h % AVATAR_TONES.length];
};

const initialsOf = (client: ClerkOrder['client']) => {
	const parts = [client.firstName, client.lastName].filter(Boolean).length
		? [client.firstName, client.lastName]
		: (client.fullName || '').trim().split(/\s+/);
	const letters = parts.filter(Boolean).map((p) => p!.charAt(0).toUpperCase());
	return (letters[0] ?? '') + (letters.length > 1 ? letters[letters.length - 1] : '') || '?';
};

/** Ghana numbers for WhatsApp: 024… → 23324…; +233… stays as is */
const whatsappNumber = (phone: string) => {
	const digits = phone.replace(/\D/g, '');
	if (digits.length === 10 && digits.startsWith('0')) return `233${digits.slice(1)}`;
	return digits;
};

/** "0245452066" → "024 545 2066" for reading; other formats are left alone */
const prettyPhone = (phone: string) => {
	const d = phone.replace(/\D/g, '');
	return d.length === 10 && d.startsWith('0') ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : phone;
};

/** The customer's avatar: initials on a colour of their own */
function CustomerAvatar({ client }: { client: ClerkOrder['client'] }) {
	const [broken, setBroken] = useState(false);
	const tone = toneFor(client.id || client.email || client.fullName || '');
	if (client.avatar && !broken) {
		return (
			<img
				src={client.avatar}
				alt=""
				onError={() => setBroken(true)}
				className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
			/>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={`flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br text-base font-bold tracking-wide text-white shadow-sm ring-2 ring-white/70 ${tone}`}
		>
			{initialsOf(client)}
		</span>
	);
}

/** One contact line: what it is, the value (as a link) and a copy button */
function ContactRow({
	icon,
	label,
	value,
	display,
	href,
}: {
	icon: ReactNode;
	label: string;
	value?: string;
	display?: string;
	href?: string;
}) {
	const t = useThemeClasses();
	const [copied, setCopied] = useState(false);
	const copy = async () => {
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard blocked: nothing to do */
		}
	};
	return (
		<div className="group flex items-center gap-3 px-4 py-2.5">
			<span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${t.isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
				{icon}
			</span>
			<div className="min-w-0 flex-1">
				<p className={`text-[11px] font-medium uppercase tracking-wide ${t.textSecondary}`}>{label}</p>
				{value ? (
					<a href={href} className={`block truncate text-sm font-medium hover:underline ${t.text}`} title={value}>
						{display ?? value}
					</a>
				) : (
					<p className={`text-sm italic ${t.textSecondary}`}>Not provided</p>
				)}
			</div>
			{value && (
				<button
					type="button"
					onClick={copy}
					aria-label={`Copy ${label.toLowerCase()}`}
					title={copied ? 'Copied' : 'Copy'}
					className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
						t.isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
					}`}
				>
					{copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
				</button>
			)}
		</div>
	);
}

/**
 * Who the order is for, set apart from the order itself: avatar, name, how to
 * reach them, and one-tap call, email and WhatsApp.
 */
export function ClientInfoCard({ client, channel }: ClientInfoCardProps) {
	const t = useThemeClasses();
	const phone = client.phoneNumber?.trim();
	const email = client.email?.trim();
	const name = client.fullName?.trim() || [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Customer';

	const action = `inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
		t.isDark ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : 'bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50'
	}`;

	return (
		<section
			aria-label="Customer"
			className={`overflow-hidden rounded-xl border shadow-sm ${t.isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
		>
			{/* Identity band, tinted so it reads as a different thing from the order */}
			<div className={`flex items-center gap-3 px-4 py-3.5 ${t.isDark ? 'bg-gradient-to-r from-gray-700/70 to-gray-800' : 'bg-gradient-to-r from-slate-50 to-white'}`}>
				<CustomerAvatar client={client} />
				<div className="min-w-0 flex-1">
					<p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${t.textSecondary}`}>
						<User size={12} /> Customer
					</p>
					<p className={`truncate text-base font-semibold ${t.text}`} title={name}>
						{name}
					</p>
				</div>
				{channel && (
					<span
						className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
							channel === 'marketplace'
								? t.isDark ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30' : 'bg-amber-50 text-amber-800 ring-amber-200'
								: t.isDark ? 'bg-gray-700 text-gray-300 ring-gray-600' : 'bg-gray-100 text-gray-600 ring-gray-200'
						}`}
					>
						{channel === 'marketplace' ? 'Your customer' : 'Via Printdecore'}
					</span>
				)}
			</div>

			<div className={`divide-y border-t ${t.isDark ? 'divide-gray-700 border-gray-700' : 'divide-gray-100 border-gray-100'}`}>
				<ContactRow icon={<Phone size={16} />} label="Phone" value={phone} display={phone && prettyPhone(phone)} href={phone ? `tel:${phone.replace(/\s/g, '')}` : undefined} />
				<ContactRow icon={<Mail size={16} />} label="Email" value={email} href={email ? `mailto:${email}` : undefined} />
			</div>

			{(phone || email) && (
				<div className={`flex gap-2 border-t px-4 py-3 ${t.isDark ? 'border-gray-700 bg-gray-900/30' : 'border-gray-100 bg-gray-50'}`}>
					{phone && (
						<a href={`tel:${phone.replace(/\s/g, '')}`} className={action}>
							<Phone size={15} /> Call
						</a>
					)}
					{phone && (
						<a href={`https://wa.me/${whatsappNumber(phone)}`} target="_blank" rel="noreferrer" className={action}>
							<MessageCircle size={15} className="text-emerald-500" /> WhatsApp
						</a>
					)}
					{email && (
						<a href={`mailto:${email}`} className={action}>
							<Mail size={15} /> Email
						</a>
					)}
				</div>
			)}
		</section>
	);
}
