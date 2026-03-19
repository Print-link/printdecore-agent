/**
 * App-wide skeleton loaders.
 *
 * Each skeleton mirrors the exact layout of its real component so the
 * transition from loading → loaded is seamless. All skeletons are
 * theme-aware via the Skeleton primitive from ./index.tsx.
 *
 * Usage:
 *   import { DashboardSkeleton } from '@/components/ui/skeletons';
 *   if (isLoading) return <DashboardSkeleton />;
 */
import { Skeleton } from './index';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────

function repeat(n: number, fn: (i: number) => JSX.Element) {
	return Array.from({ length: n }, (_, i) => fn(i));
}

// ─── KPI / Stat Card Skeleton ────────────────────────────────────

export function StatCardSkeleton() {
	const t = useThemeClasses();
	return (
		<div className={cn('rounded-xl p-6', t.surface)}>
			<div className="flex items-center justify-between">
				<div className="space-y-3 flex-1">
					<Skeleton className="h-3.5 w-24" />
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-2.5 w-20" />
				</div>
				<Skeleton className="w-8 h-8 rounded-lg" />
			</div>
		</div>
	);
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{repeat(count, i => <StatCardSkeleton key={i} />)}
		</div>
	);
}

// ─── Dashboard Skeleton ──────────────────────────────────────────

export function DashboardSkeleton() {
	const t = useThemeClasses();
	return (
		<div className="flex flex-col gap-3">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-9 w-36 rounded-lg" />
			</div>

			{/* KPI Row */}
			<StatsGridSkeleton />

			{/* Pipeline */}
			<div className={cn('rounded-xl p-5', t.surface)}>
				<Skeleton className="h-4 w-28 mb-4" />
				<div className="flex gap-2">
					{repeat(5, i => (
						<div key={i} className="flex-1 space-y-2">
							<Skeleton className="h-16 w-full rounded-lg" />
							<Skeleton className="h-3 w-16 mx-auto" />
						</div>
					))}
				</div>
			</div>

			{/* Bottom grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
				<div className={cn('rounded-xl p-5', t.surface)}>
					<Skeleton className="h-4 w-36 mb-4" />
					{repeat(5, i => (
						<div key={i} className="flex items-center gap-3 py-3">
							<Skeleton className="h-3.5 w-3.5 rounded" />
							<Skeleton className="h-3 flex-1" />
							<Skeleton className="h-3 w-12" />
						</div>
					))}
				</div>
				<div className={cn('rounded-xl p-5', t.surface)}>
					<Skeleton className="h-4 w-36 mb-4" />
					<div className="grid grid-cols-7 gap-1">
						{repeat(35, i => (
							<Skeleton key={i} className="h-8 w-full rounded" />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Order Card Skeleton ─────────────────────────────────────────

function OrderCardSkeleton() {
	const t = useThemeClasses();
	return (
		<div className={cn('p-3 rounded-lg', t.surface)}>
			<div className="flex items-center justify-between mb-1.5">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-5 w-16 rounded-full" />
			</div>
			<Skeleton className="h-3 w-28 mb-2" />
			<div className="flex items-center justify-between">
				<Skeleton className="h-5 w-16" />
				<Skeleton className="h-2.5 w-12" />
			</div>
		</div>
	);
}

export function OrdersListSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="space-y-2">
			{repeat(count, i => <OrderCardSkeleton key={i} />)}
		</div>
	);
}

// ─── Table Skeleton ──────────────────────────────────────────────

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
	const t = useThemeClasses();
	return (
		<div className={cn('rounded-xl overflow-hidden', t.surface)}>
			{/* Header */}
			<div className={cn('flex gap-4 px-5 py-3 border-b', t.border)}>
				{repeat(cols, i => (
					<Skeleton key={i} className="h-3 flex-1" />
				))}
			</div>
			{/* Rows */}
			{repeat(rows, i => (
				<div key={i} className={cn('flex items-center gap-4 px-5 py-4 border-b last:border-0', t.borderSubtle)}>
					{repeat(cols, j => (
						<Skeleton key={j} className={cn('h-3', j === 0 ? 'w-32' : 'flex-1')} />
					))}
				</div>
			))}
		</div>
	);
}

// ─── Services / Category Grid Skeleton ───────────────────────────

function CategoryCardSkeleton() {
	const t = useThemeClasses();
	return (
		<div className={cn('rounded-xl p-5 border', t.surface)}>
			<div className="flex items-center gap-3 mb-4">
				<Skeleton className="w-12 h-12 rounded-xl" />
				<div className="flex-1 space-y-1.5">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-2.5 w-40" />
				</div>
			</div>
			<Skeleton className="h-3 w-full mb-2" />
			<Skeleton className="h-3 w-3/4" />
		</div>
	);
}

export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{repeat(count, i => <CategoryCardSkeleton key={i} />)}
		</div>
	);
}

// ─── Overview Page Skeleton ──────────────────────────────────────

export function OverviewSkeleton() {
	const t = useThemeClasses();
	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<Skeleton className="h-7 w-52 mb-2" />
				<Skeleton className="h-3.5 w-72" />
			</div>

			{/* Stats */}
			<StatsGridSkeleton />

			{/* Branch Performance Table */}
			<div className={cn('rounded-2xl shadow-sm', t.surface)}>
				<div className="flex items-center justify-between px-6 pt-6 pb-4">
					<div className="space-y-1.5">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-3 w-28" />
					</div>
					<Skeleton className="h-8 w-28 rounded-lg" />
				</div>
				<TableSkeleton rows={4} cols={5} />
			</div>

			{/* Reviews */}
			<div className={cn('rounded-2xl shadow-sm p-6', t.surface)}>
				<Skeleton className="h-5 w-32 mb-6" />
				<div className="space-y-4">
					{repeat(3, i => (
						<div key={i} className={cn('p-4 rounded-xl border', t.isDark ? 'border-gray-700' : 'border-gray-100')}>
							<div className="flex items-start gap-3">
								<Skeleton circle className="w-10 h-10" />
								<div className="flex-1 space-y-2">
									<div className="flex items-center justify-between">
										<Skeleton className="h-3.5 w-24" />
										<Skeleton className="h-3 w-10" />
									</div>
									<Skeleton className="h-2.5 w-32" />
									<Skeleton className="h-3 w-full" />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── User Management Skeleton ────────────────────────────────────

export function UserTableSkeleton({ rows = 5 }: { rows?: number }) {
	const t = useThemeClasses();
	return (
		<div>
			{repeat(rows, i => (
				<div key={i} className={cn('flex items-center gap-4 px-5 py-4 border-b', t.borderSubtle)}>
					<Skeleton className="w-4 h-4 rounded" />
					<Skeleton circle className="w-9 h-9" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-3.5 w-28" />
						<Skeleton className="h-2.5 w-40" />
					</div>
					<Skeleton className="h-5 w-16 rounded-full" />
					<Skeleton className="h-5 w-14 rounded-full" />
					<Skeleton className="h-5 w-14 rounded-full" />
					<Skeleton className="h-7 w-7 rounded" />
				</div>
			))}
		</div>
	);
}

// ─── Branch Info / Settings Skeleton ─────────────────────────────

export function BranchInfoSkeleton() {
	const t = useThemeClasses();
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Skeleton circle className="w-16 h-16" />
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-3.5 w-32" />
				</div>
			</div>

			{/* Info cards */}
			{repeat(3, i => (
				<div key={i} className={cn('rounded-xl p-6', t.surface)}>
					<Skeleton className="h-5 w-36 mb-4" />
					<div className="grid grid-cols-2 gap-4">
						{repeat(4, j => (
							<div key={j} className="space-y-1.5">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-4 w-36" />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Printer Status Grid Skeleton ────────────────────────────────

export function PrinterGridSkeleton({ count = 3 }: { count?: number }) {
	const t = useThemeClasses();
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{repeat(count, i => (
				<div key={i} className={cn('p-4 rounded-lg border', t.isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200')}>
					<div className="flex items-start justify-between mb-3">
						<div className="flex items-center gap-3">
							<Skeleton className="w-6 h-6 rounded" />
							<div className="space-y-1.5">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-16" />
							</div>
						</div>
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
					<Skeleton className="h-3 w-32 mt-3" />
				</div>
			))}
		</div>
	);
}

// ─── Branches List Skeleton ──────────────────────────────────────

export function BranchCardSkeleton() {
	const t = useThemeClasses();
	return (
		<div className={cn('rounded-xl p-5 border', t.surface)}>
			<div className="flex items-start gap-4">
				<Skeleton className="w-16 h-16 rounded-xl" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-5 w-36" />
					<Skeleton className="h-3 w-48" />
					<div className="flex gap-2 mt-2">
						<Skeleton className="h-5 w-16 rounded-full" />
						<Skeleton className="h-5 w-20 rounded-full" />
					</div>
				</div>
			</div>
		</div>
	);
}

export function BranchesListSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="space-y-3">
			{repeat(count, i => <BranchCardSkeleton key={i} />)}
		</div>
	);
}

// ─── Branch Edit Skeleton ────────────────────────────────────────

export function BranchEditSkeleton() {
	const t = useThemeClasses();
	return (
		<div className="space-y-6">
			{/* Sticky header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Skeleton className="w-9 h-9 rounded-lg" />
					<div className="space-y-1.5">
						<Skeleton className="h-5 w-36" />
						<Skeleton className="h-3 w-24" />
					</div>
				</div>
				<Skeleton className="h-9 w-24 rounded-lg" />
			</div>

			{/* Tabs */}
			<div className={cn('flex gap-4 border-b pb-1', t.border)}>
				{repeat(3, i => <Skeleton key={i} className="h-8 w-32 rounded-lg" />)}
			</div>

			{/* Form fields */}
			<div className={cn('rounded-xl p-6', t.surface)}>
				<div className="grid grid-cols-2 gap-6">
					{repeat(6, i => (
						<div key={i} className="space-y-2">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-10 w-full rounded-lg" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── Report Skeleton ─────────────────────────────────────────────

export function ReportSkeleton() {
	const t = useThemeClasses();
	return (
		<div className="space-y-6">
			<StatsGridSkeleton count={5} />

			{/* Revenue by status */}
			<div className={cn('rounded-xl p-6', t.surface)}>
				<Skeleton className="h-5 w-36 mb-4" />
				<TableSkeleton rows={4} cols={3} />
			</div>

			{/* Daily trend */}
			<div className={cn('rounded-xl p-6', t.surface)}>
				<Skeleton className="h-5 w-40 mb-4" />
				<Skeleton className="h-64 w-full rounded-lg" />
			</div>
		</div>
	);
}

// ─── Access Control / Activity Skeleton ──────────────────────────

export function AccessControlSkeleton() {
	const t = useThemeClasses();
	return (
		<div className="space-y-4">
			{repeat(4, i => (
				<div key={i} className={cn('rounded-xl p-4 border', t.surface)}>
					<div className="flex items-center gap-3">
						<Skeleton circle className="w-10 h-10" />
						<div className="flex-1 space-y-1.5">
							<Skeleton className="h-3.5 w-28" />
							<Skeleton className="h-2.5 w-40" />
						</div>
						<Skeleton className="h-5 w-20 rounded-full" />
						<Skeleton className="h-5 w-5 rounded" />
					</div>
				</div>
			))}
		</div>
	);
}

export function ActivityLogSkeleton({ count = 6 }: { count?: number }) {
	const t = useThemeClasses();
	return (
		<div className="space-y-3">
			{repeat(count, i => (
				<div key={i} className="flex items-start gap-3">
					<Skeleton circle className="w-3 h-3 mt-1.5 flex-shrink-0" />
					<div className="flex-1 space-y-1">
						<Skeleton className="h-3.5 w-3/4" />
						<Skeleton className="h-2.5 w-24" />
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Accept Invitation Skeleton ──────────────────────────────────

export function InvitationFormSkeleton() {
	const t = useThemeClasses();
	return (
		<div className={cn('rounded-xl p-8 max-w-lg mx-auto', t.surface)}>
			<Skeleton className="h-6 w-40 mx-auto mb-6" />
			<div className={cn('rounded-lg p-4 mb-6 border', t.isDark ? 'border-gray-700' : 'border-gray-200')}>
				{repeat(3, i => (
					<div key={i} className="flex justify-between py-2">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-3 w-32" />
					</div>
				))}
			</div>
			<div className="space-y-4">
				{repeat(5, i => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-10 w-full rounded-lg" />
					</div>
				))}
				<Skeleton className="h-10 w-full rounded-lg" />
			</div>
		</div>
	);
}

// ─── Profile Page Skeleton ───────────────────────────────────────

export function ProfileSkeleton() {
	const t = useThemeClasses();
	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<Skeleton className="h-7 w-32 mb-1" />
				<Skeleton className="h-3.5 w-56" />
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Personal info */}
				<div className={cn('rounded-xl p-6', t.surface)}>
					<div className="flex items-center gap-4 mb-6">
						<Skeleton circle className="w-16 h-16" />
						<div className="space-y-2">
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-3 w-40" />
						</div>
					</div>
					<div className="space-y-4">
						{repeat(4, i => (
							<div key={i} className="space-y-1.5">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-4 w-48" />
							</div>
						))}
					</div>
				</div>

				{/* Security */}
				<div className={cn('rounded-xl p-6', t.surface)}>
					<Skeleton className="h-5 w-20 mb-6" />
					<div className="space-y-4">
						{repeat(3, i => (
							<div key={i} className="space-y-2">
								<Skeleton className="h-3 w-28" />
								<Skeleton className="h-10 w-full rounded-lg" />
							</div>
						))}
						<Skeleton className="h-10 w-36 rounded-lg" />
					</div>
				</div>
			</div>
		</div>
	);
}
