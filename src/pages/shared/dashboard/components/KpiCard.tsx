import { useThemeClasses } from "../../../../lib/theme";
import { cn } from "../../../../lib/utils";

export type KpiAccent = "amber" | "green" | "blue" | "purple" | "red" | "gray";

interface KpiCardProps {
	icon: React.ReactNode;
	title: string;
	value: string | number;
	subtitle: string;
	/** Color accent for the icon badge */
	accent?: KpiAccent;
	/** Optional trend indicator: "+12%" or "-3%" */
	trend?: string;
}

const accentStyles: Record<
	KpiAccent,
	{ bg: string; bgDark: string; text: string; textDark: string }
> = {
	amber: { bg: "bg-amber-50", bgDark: "bg-amber-900/20", text: "text-amber-600", textDark: "text-amber-400" },
	green: { bg: "bg-emerald-50", bgDark: "bg-emerald-900/20", text: "text-emerald-600", textDark: "text-emerald-400" },
	blue: { bg: "bg-blue-50", bgDark: "bg-blue-900/20", text: "text-blue-600", textDark: "text-blue-400" },
	purple: { bg: "bg-purple-50", bgDark: "bg-purple-900/20", text: "text-purple-600", textDark: "text-purple-400" },
	red: { bg: "bg-red-50", bgDark: "bg-red-900/20", text: "text-red-600", textDark: "text-red-400" },
	gray: { bg: "bg-gray-100", bgDark: "bg-gray-700", text: "text-gray-500", textDark: "text-gray-400" },
};

export function KpiCard({ icon, title, value, subtitle, accent = "gray", trend }: KpiCardProps) {
	const t = useThemeClasses();
	const a = accentStyles[accent];

	return (
		<div className={cn("p-4 rounded-xl border", t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
			<div className="flex items-center justify-between mb-3">
				<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", t.isDark ? a.bgDark : a.bg)}>
					<span className={cn(t.isDark ? a.textDark : a.text)}>{icon}</span>
				</div>
				{trend && (
					<span
						className={cn(
							"text-[10px] font-bold px-1.5 py-0.5 rounded-full",
							trend.startsWith("-")
								? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
								: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
						)}
					>
						{trend}
					</span>
				)}
			</div>
			<p className={cn("text-xs font-medium mb-1", t.textSecondary)}>{title}</p>
			<p className={cn("text-xl font-bold tracking-tight", t.text)}>{value}</p>
			<p className={cn("text-[11px] mt-1", t.textTertiary)}>{subtitle}</p>
		</div>
	);
}
