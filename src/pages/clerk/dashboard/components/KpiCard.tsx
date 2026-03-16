import { useTheme } from '../../../../contexts/ThemeContext';

interface KpiCardProps {
	icon: React.ReactNode;
	title: string;
	value: string | number;
	subtitle: string;
}

export function KpiCard({ icon, title, value, subtitle }: KpiCardProps) {
	const { theme } = useTheme();

	return (
		<div
			className={`p-4 rounded-lg border ${
				theme === 'dark'
					? 'bg-gray-800 border-gray-700'
					: 'bg-white border-gray-200'
			}`}
		>
			<div className="flex items-center gap-2 mb-2">
				<span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
					{icon}
				</span>
				<span
					className={`text-xs font-medium uppercase tracking-wide ${
						theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
					}`}
				>
					{title}
				</span>
			</div>
			<div
				className={`text-2xl font-semibold mb-0.5 ${
					theme === 'dark' ? 'text-gray-50' : 'text-gray-900'
				}`}
			>
				{value}
			</div>
			<p
				className={`text-xs ${
					theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
				}`}
			>
				{subtitle}
			</p>
		</div>
	);
}
