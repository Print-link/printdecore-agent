import SidebarTabLayout, {
	type SidebarTab,
} from "../../components/layouts/SidebarTabLayout";
import { Receipt, Phone, Zap, Send, TrendingUp } from "../../components/icons";
import PromosPage from "./PromosPage";
import QuickRepliesPage from "./QuickRepliesPage";
import ContactsPage from "./ContactsPage";
import BroadcastsPage from "./BroadcastsPage";
import PerformancePage from "./PerformancePage";

const tabs: SidebarTab[] = [
	{ id: "promos", label: "Promos", icon: Receipt },
	{ id: "contacts", label: "Contacts", icon: Phone },
	{ id: "quick-replies", label: "Quick Replies", icon: Zap },
	{ id: "broadcasts", label: "Broadcasts", icon: Send },
	{ id: "performance", label: "Performance", icon: TrendingUp },
];

export default function MarketingPage() {
	return (
		<SidebarTabLayout
			title="Marketing"
			basePath="/app/marketing"
			tabs={tabs}
			defaultTab="promos"
		>
			{(activeTab) => (
				<>
					{activeTab === "promos" && <PromosPage />}
					{activeTab === "contacts" && <ContactsPage />}
					{activeTab === "quick-replies" && <QuickRepliesPage />}
					{activeTab === "broadcasts" && <BroadcastsPage />}
					{activeTab === "performance" && <PerformancePage />}
				</>
			)}
		</SidebarTabLayout>
	);
}
