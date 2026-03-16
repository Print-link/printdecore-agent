import { ChevronRight } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

interface OrderPipelineProps {
	pending: number;
	quoted: number;
	paid: number;
	inProgress: number;
	completed: number;
}

const stages = [
	{ key: 'pending', label: 'Pending' },
	{ key: 'quoted', label: 'Quoted' },
	{ key: 'paid', label: 'Paid' },
	{ key: 'inProgress', label: 'In Progress' },
	{ key: 'completed', label: 'Completed' },
] as const;

export function OrderPipeline(props: OrderPipelineProps) {
	const { theme } = useTheme();
	const total = props.pending + props.quoted + props.paid + props.inProgress + props.completed;

	return (
		<div
			className={`p-4 rounded-lg border ${
				theme === 'dark'
					? 'bg-gray-800 border-gray-700'
					: 'bg-white border-gray-200'
			}`}
		>
			<h3
				className={`text-xs font-medium uppercase tracking-wide mb-3 ${
					theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
				}`}
			>
				Order Pipeline
			</h3>

			{/* Desktop: horizontal */}
			<div className="hidden sm:flex items-center gap-1">
				{stages.map((stage, i) => {
					const count = props[stage.key];
					const pct = total > 0 ? Math.round((count / total) * 100) : 0;

					return (
						<div key={stage.key} className="flex items-center flex-1 min-w-0">
							<div
								className={`flex-1 px-3 py-3 rounded-lg text-center ${
									theme === 'dark'
										? 'bg-gray-750 hover:bg-gray-700'
										: 'bg-gray-50 hover:bg-gray-100'
								} transition-colors`}
							>
								<div
									className={`text-xl font-semibold ${
										theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
									}`}
								>
									{count}
								</div>
								<div
									className={`text-[11px] font-medium mt-0.5 ${
										theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
									}`}
								>
									{stage.label}
								</div>
								{total > 0 && (
									<div
										className={`text-[10px] mt-1 ${
											theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
										}`}
									>
										{pct}%
									</div>
								)}
							</div>
							{i < stages.length - 1 && (
								<ChevronRight
									size={14}
									className={`flex-shrink-0 mx-0.5 ${
										theme === 'dark' ? 'text-gray-700' : 'text-gray-200'
									}`}
								/>
							)}
						</div>
					);
				})}
			</div>

			{/* Mobile: vertical */}
			<div className="sm:hidden space-y-1.5">
				{stages.map((stage, i) => {
					const count = props[stage.key];
					const pct = total > 0 ? Math.round((count / total) * 100) : 0;

					return (
						<div key={stage.key}>
							<div
								className={`flex items-center justify-between px-3 py-2 rounded-lg ${
									theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'
								}`}
							>
								<span
									className={`text-sm ${
										theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
									}`}
								>
									{stage.label}
								</span>
								<div className="flex items-center gap-2">
									<span
										className={`text-sm font-semibold ${
											theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
										}`}
									>
										{count}
									</span>
									{total > 0 && (
										<span
											className={`text-xs ${
												theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
											}`}
										>
											{pct}%
										</span>
									)}
								</div>
							</div>
							{i < stages.length - 1 && (
								<div className="flex justify-center">
									<div
										className={`w-px h-1.5 ${
											theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
										}`}
									/>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
