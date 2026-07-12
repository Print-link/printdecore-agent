import SidebarTabLayout, {
	type SidebarTab,
} from "../../components/layouts/SidebarTabLayout";
import { Printer, Palette, Volume2, MessageCircle } from "../../components/icons";
import PrinterSettings from "./settings/PrinterSettings";
import UISettings from "./settings/UISettings";
import SoundSettings from "./settings/SoundSettings";
import WhatsAppSettings from "./settings/WhatsAppSettings";

// Self-service billing/commission/wallet payout is retired here — Printdecore
// now collects customer payment centrally and settles with vendors directly.
const tabs: SidebarTab[] = [
	{ id: "printers", label: "Printer Status", icon: Printer },
	{ id: "ui", label: "UI Preferences", icon: Palette },
	{ id: "sounds", label: "Sounds", icon: Volume2 },
	{ id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];

export default function SettingsPage() {
	return (
		<SidebarTabLayout
			title="Settings"
			basePath="/app/settings"
			tabs={tabs}
			defaultTab="printers"
		>
			{(activeTab) => (
				<>
					{activeTab === "printers" && <PrinterSettings />}
					{activeTab === "ui" && <UISettings />}
					{activeTab === "sounds" && <SoundSettings />}
					{activeTab === "whatsapp" && <WhatsAppSettings />}
				</>
			)}
		</SidebarTabLayout>
	);
}
