import { useTheme } from "../../../contexts/ThemeContext";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { Card, PageHeader, Button, Section } from "../../../components/ui";
import { useSettings } from "../../../contexts/SettingsContext";

function OptionRow<T extends string>({
	options,
	value,
	onChange,
}: {
	options: T[];
	value: T;
	onChange: (v: T) => void;
}) {
	const t = useThemeClasses();
	return (
		<div className="flex gap-2">
			{options.map((opt) => (
				<button
					key={opt}
					onClick={() => onChange(opt)}
					className={cn(
						"flex-1 px-4 py-2 rounded-md border transition-all cursor-pointer",
						value === opt
							? "bg-amber-400 text-gray-900 border-amber-400 font-bold"
							: t.isDark
								? "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500"
								: "bg-white border-gray-300 text-gray-700 hover:border-gray-400",
					)}
				>
					{opt.charAt(0).toUpperCase() + opt.slice(1)}
				</button>
			))}
		</div>
	);
}

export default function UISettings() {
	const { toggleTheme } = useTheme();
	const t = useThemeClasses();
	const { settings, setFontSize, setUIScale, resetSettings } = useSettings();

	return (
		<Section>
			<PageHeader
				title="UI Preferences"
				description="Customize the appearance and layout of the application"
			/>
			<div className="space-y-6 max-w-2xl mt-6">
				<Card>
					<label className={cn("block text-sm font-medium mb-3", t.textSecondary)}>
						Theme
					</label>
					<Button variant="secondary" onClick={toggleTheme}>
						Switch to {t.isDark ? "Light" : "Dark"} Mode
					</Button>
				</Card>

				<Card>
					<label className={cn("block text-sm font-medium mb-3", t.textSecondary)}>
						Font Size
					</label>
					<div className="mb-3">
						<OptionRow
							options={["small", "medium", "large"]}
							value={settings.fontSize}
							onChange={setFontSize}
						/>
					</div>
					<div
						className={cn(
							"p-3 rounded-md text-sm",
							t.isDark
								? "bg-gray-700 border border-gray-600"
								: "bg-gray-50 border border-gray-200",
							t.textSecondary,
						)}
					>
						Preview: The quick brown fox jumps over the lazy dog
					</div>
				</Card>

				<Card>
					<label className={cn("block text-sm font-medium mb-3", t.textSecondary)}>
						UI Scale
					</label>
					<div className="mb-2">
						<OptionRow
							options={["compact", "comfortable", "spacious"]}
							value={settings.uiScale}
							onChange={setUIScale}
						/>
					</div>
					<p className={cn("text-xs", t.textTertiary)}>
						Adjusts spacing and padding throughout the app
					</p>
				</Card>

				<Card>
					<Button variant="danger" className="w-full" onClick={resetSettings}>
						Reset to Defaults
					</Button>
				</Card>
			</div>
		</Section>
	);
}
