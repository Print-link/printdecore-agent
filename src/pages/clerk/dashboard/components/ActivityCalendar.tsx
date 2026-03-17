import { ChevronLeft, ChevronRight, Calendar } from '../../../../components/icons';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';

interface ActivityCalendarProps {
	calendarDates: Date[];
	calendarMonthHeader: string;
	calendarGridStart: number;
	monthlyCountMap: Map<string, number>;
	selectedDate: string;
	calendarOffset: number;
	onDateSelect: (date: string) => void;
	onCalendarOffsetChange: (offset: number) => void;
	onTodayClick: () => void;
}

export function ActivityCalendar({
	calendarDates,
	calendarMonthHeader,
	calendarGridStart,
	monthlyCountMap,
	selectedDate,
	calendarOffset = 0,
	onDateSelect,
	onCalendarOffsetChange,
	onTodayClick,
}: ActivityCalendarProps) {
	const t = useThemeClasses();
	const todayStr = new Date().toISOString().split('T')[0];

	return (
		<div
			className={cn('p-4 rounded-lg flex flex-col', t.surface)}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<Calendar
						size={14}
						className={t.textTertiary}
					/>
					<h3
						className={cn('text-sm font-semibold', t.isDark ? 'text-gray-200' : 'text-gray-800')}
					>
						{calendarMonthHeader || 'Activity'}
					</h3>
				</div>
				<div className="flex items-center gap-1">
					<button
						onClick={() => onCalendarOffsetChange(calendarOffset + 1)}
						className={cn(
							'p-1.5 rounded transition-colors',
							t.isDark
								? 'hover:bg-gray-700 text-gray-400'
								: 'hover:bg-gray-100 text-gray-500'
						)}
					>
						<ChevronLeft size={14} />
					</button>
					<button
						onClick={onTodayClick}
						disabled={calendarOffset === 0}
						className={cn(
							'px-2 py-1 rounded text-[11px] font-medium transition-colors',
							calendarOffset === 0
								? t.isDark
									? 'text-gray-600 cursor-not-allowed'
									: 'text-gray-300 cursor-not-allowed'
								: t.isDark
									? 'text-gray-300 hover:bg-gray-700'
									: 'text-gray-600 hover:bg-gray-100'
						)}
					>
						Today
					</button>
					<button
						onClick={() => onCalendarOffsetChange(calendarOffset - 1)}
						disabled={calendarOffset === 0}
						className={cn(
							'p-1.5 rounded transition-colors',
							calendarOffset === 0
								? t.isDark
									? 'text-gray-700 cursor-not-allowed'
									: 'text-gray-200 cursor-not-allowed'
								: t.isDark
									? 'hover:bg-gray-700 text-gray-400'
									: 'hover:bg-gray-100 text-gray-500'
						)}
					>
						<ChevronRight size={14} />
					</button>
				</div>
			</div>

			{/* Weekday headers */}
			<div className="grid grid-cols-7 mb-1">
				{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
					<div
						key={day}
						className={cn(
							'text-center text-[10px] font-medium py-1',
							t.isDark ? 'text-gray-600' : 'text-gray-300'
						)}
					>
						{day}
					</div>
				))}
			</div>

			{/* Date grid */}
			<div className="grid grid-cols-7 gap-px">
				{/* Empty cells before first day */}
				{Array.from({ length: calendarGridStart }).map((_, i) => (
					<div key={`empty-${i}`} className="aspect-square" />
				))}

				{calendarDates.map((date, index) => {
					const dateStr = date.toISOString().split('T')[0];
					const count = monthlyCountMap.get(dateStr) || 0;
					const isToday = dateStr === todayStr;
					const isSelected = dateStr === selectedDate;

					return (
						<button
							key={index}
							onClick={() => onDateSelect(dateStr)}
							className={cn(
								'aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors relative',
								isSelected
									? t.isDark
										? 'bg-gray-600 text-white'
										: 'bg-gray-900 text-white'
									: isToday
										? t.isDark
											? 'bg-gray-700 text-gray-100'
											: 'bg-gray-100 text-gray-900'
										: t.isDark
											? 'text-gray-300 hover:bg-gray-750'
											: 'text-gray-700 hover:bg-gray-50'
							)}
						>
							<span
								className={cn(
									'text-[11px] font-medium',
									isSelected
										? 'text-white'
										: isToday
											? 'font-semibold'
											: ''
								)}
							>
								{date.getDate()}
							</span>
							{count > 0 && (
								<span
									className={cn(
										'text-[8px] font-semibold mt-0.5',
										isSelected
											? 'text-gray-300'
											: t.textTertiary
									)}
								>
									{count}
								</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
