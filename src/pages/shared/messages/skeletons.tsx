/**
 * Skeleton loaders for the messaging UI.
 * Each skeleton mirrors the exact layout of its real component
 * so the transition from loading → loaded is seamless.
 */
import { Skeleton } from '../../../components/ui';
import { useThemeClasses } from '../../../lib/theme';
import { cn } from '../../../lib/utils';

// ─── Single Chat Row Skeleton ────────────────────────────────────

function ChatItemSkeleton() {
	return (
		<div className="p-4 flex items-start gap-3">
			{/* Avatar */}
			<Skeleton circle className="w-12 h-12 flex-shrink-0" />
			{/* Text */}
			<div className="flex-1 min-w-0 space-y-2 pt-1">
				<div className="flex items-center justify-between">
					<Skeleton className="h-3.5 w-28" />
					<Skeleton className="h-3 w-14" />
				</div>
				<Skeleton className="h-3 w-40" />
			</div>
		</div>
	);
}

// ─── Chat List Skeleton (sidebar) ────────────────────────────────

export function ChatListSkeleton({ count = 8 }: { count?: number }) {
	const t = useThemeClasses();
	return (
		<div className={cn('divide-y', t.isDark ? 'divide-gray-700' : 'divide-gray-200')}>
			{Array.from({ length: count }).map((_, i) => (
				<ChatItemSkeleton key={i} />
			))}
		</div>
	);
}

// ─── Single Message Bubble Skeleton ──────────────────────────────

function MessageBubbleSkeleton({ fromMe, width = 'w-48' }: { fromMe: boolean; width?: string }) {
	const t = useThemeClasses();
	return (
		<div className={cn('flex', fromMe ? 'justify-end' : 'justify-start')}>
			<div className={cn('max-w-[70%] flex flex-col', fromMe ? 'items-end' : 'items-start')}>
				{!fromMe && <Skeleton className="h-2.5 w-16 mb-1 mx-2" />}
				<div className={cn(
					'px-4 py-3 rounded-lg space-y-2',
					fromMe
						? 'bg-amber-400/30'
						: t.isDark ? 'bg-gray-700/60' : 'bg-gray-200/60',
				)}>
					<Skeleton className={cn('h-3', width)} />
					{!fromMe && <Skeleton className="h-3 w-32" />}
					<Skeleton className="h-2.5 w-10 ml-auto" />
				</div>
			</div>
		</div>
	);
}

// ─── Messages Area Skeleton (conversation body) ──────────────────

export function MessagesSkeleton() {
	return (
		<div className="p-4 space-y-4">
			{/* Date separator */}
			<div className="flex items-center justify-center my-4">
				<Skeleton className={cn('h-6 w-20 rounded-full')} />
			</div>

			{/* Incoming messages cluster */}
			<div className="space-y-2">
				<MessageBubbleSkeleton fromMe={false} width="w-56" />
				<MessageBubbleSkeleton fromMe={false} width="w-40" />
			</div>

			{/* Outgoing message */}
			<div className="space-y-2">
				<MessageBubbleSkeleton fromMe width="w-44" />
			</div>

			{/* Another date separator */}
			<div className="flex items-center justify-center my-4">
				<Skeleton className="h-6 w-16 rounded-full" />
			</div>

			{/* Mixed conversation */}
			<div className="space-y-2">
				<MessageBubbleSkeleton fromMe={false} width="w-64" />
				<MessageBubbleSkeleton fromMe width="w-36" />
				<MessageBubbleSkeleton fromMe width="w-52" />
				<MessageBubbleSkeleton fromMe={false} width="w-44" />
			</div>
		</div>
	);
}

// ─── Conversation Header Skeleton ────────────────────────────────

export function ConversationHeaderSkeleton() {
	const t = useThemeClasses();
	return (
		<div className={cn('px-6 py-4 border-b flex items-center gap-4', t.isDark ? 'bg-gray-800' : 'bg-white', t.border)}>
			{/* Back button placeholder */}
			<Skeleton className="w-9 h-9 rounded-lg" />
			{/* Avatar */}
			<Skeleton circle className="w-10 h-10" />
			{/* Name */}
			<div className="space-y-1.5">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-2.5 w-16" />
			</div>
		</div>
	);
}

// ─── Search Bar Skeleton ─────────────────────────────────────────

export function SearchBarSkeleton() {
	return <Skeleton className="h-9 w-full rounded-lg" />;
}

// ─── Syncing Banner ──────────────────────────────────────────────

export function SyncingBanner() {
	const t = useThemeClasses();
	return (
		<div className={cn(
			'px-4 py-2.5 flex items-center gap-3 border-b',
			t.border,
			t.isDark ? 'bg-gray-700/50' : 'bg-amber-50',
		)}>
			{/* Animated pulsing dot */}
			<span className="relative flex h-2.5 w-2.5">
				<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
				<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
			</span>
			<p className={cn('text-xs font-medium', t.textSecondary)}>
				Syncing messages from WhatsApp...
			</p>
		</div>
	);
}
