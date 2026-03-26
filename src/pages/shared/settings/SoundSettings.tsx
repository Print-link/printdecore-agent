import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { Card, PageHeader, Button, Section } from "../../../components/ui";
import { useSettings } from "../../../contexts/SettingsContext";
import { Play } from "../../../components/icons";

function Toggle({
	on,
	onChange,
	disabled,
}: {
	on: boolean;
	onChange: () => void;
	disabled?: boolean;
}) {
	const t = useThemeClasses();
	return (
		<button
			onClick={onChange}
			disabled={disabled}
			className={cn(
				"relative inline-flex h-6 w-11 items-center rounded-full transition-colors border-none cursor-pointer",
				disabled && "opacity-50 cursor-not-allowed",
				on ? "bg-amber-400" : t.isDark ? "bg-gray-600" : "bg-gray-300",
			)}
		>
			<span
				className={cn(
					"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
					on ? "translate-x-6" : "translate-x-1",
				)}
			/>
		</button>
	);
}

export default function SoundSettings() {
	const t = useThemeClasses();
	const {
		settings,
		setSoundEnabled,
		setSoundVolume,
		setJobNotificationEnabled,
		setPaymentNotificationEnabled,
		playSound,
	} = useSettings();

	return (
		<Section>
			<PageHeader
				title="Sound Settings"
				description="Configure notification sounds and volume"
			/>
			<div className="space-y-6 max-w-2xl mt-6">
				<Card>
					<div className="flex items-center justify-between">
						<div>
							<label className={cn("block text-sm font-medium", t.textSecondary)}>
								Enable Sounds
							</label>
							<p className={cn("text-xs mt-1", t.textTertiary)}>
								Turn on or off all notification sounds
							</p>
						</div>
						<Toggle
							on={settings.sounds.enabled}
							onChange={() => setSoundEnabled(!settings.sounds.enabled)}
						/>
					</div>
				</Card>

				<Card>
					<label className={cn("block text-sm font-medium mb-3", t.textSecondary)}>
						Volume: {Math.round(settings.sounds.volume * 100)}%
					</label>
					<input
						type="range"
						min="0"
						max="1"
						step="0.1"
						value={settings.sounds.volume}
						onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
						disabled={!settings.sounds.enabled}
						className={cn(
							"w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-400",
							!settings.sounds.enabled && "opacity-50 cursor-not-allowed",
							t.isDark ? "bg-gray-700" : "bg-gray-200",
						)}
					/>
					<div className="flex justify-between mt-1">
						<span className={cn("text-xs", t.textTertiary)}>Mute</span>
						<span className={cn("text-xs", t.textTertiary)}>Max</span>
					</div>
				</Card>

				<Card>
					<div className="flex items-center justify-between mb-3">
						<div className="flex-1">
							<label className={cn("block text-sm font-medium", t.textSecondary)}>
								Job Notification Sound
							</label>
							<p className={cn("text-xs mt-1", t.textTertiary)}>
								Play sound when a new job is received
							</p>
						</div>
						<Toggle
							on={settings.sounds.jobNotificationEnabled}
							onChange={() =>
								setJobNotificationEnabled(!settings.sounds.jobNotificationEnabled)
							}
							disabled={!settings.sounds.enabled}
						/>
					</div>
					<Button
						variant="secondary"
						size="sm"
						icon={Play}
						onClick={() => playSound("job")}
						disabled={
							!settings.sounds.enabled || !settings.sounds.jobNotificationEnabled
						}
					>
						Test Sound
					</Button>
				</Card>

				<Card>
					<div className="flex items-center justify-between mb-3">
						<div className="flex-1">
							<label className={cn("block text-sm font-medium", t.textSecondary)}>
								Payment Notification Sound
							</label>
							<p className={cn("text-xs mt-1", t.textTertiary)}>
								Play sound when a payment is received
							</p>
						</div>
						<Toggle
							on={settings.sounds.paymentNotificationEnabled}
							onChange={() =>
								setPaymentNotificationEnabled(
									!settings.sounds.paymentNotificationEnabled,
								)
							}
							disabled={!settings.sounds.enabled}
						/>
					</div>
					<Button
						variant="secondary"
						size="sm"
						icon={Play}
						onClick={() => playSound("payment")}
						disabled={
							!settings.sounds.enabled ||
							!settings.sounds.paymentNotificationEnabled
						}
					>
						Test Sound
					</Button>
				</Card>
			</div>
		</Section>
	);
}
