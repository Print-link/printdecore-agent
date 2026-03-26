import { useNavigate, useLocation } from "react-router-dom";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import type { IconComponent } from "../icons";

export interface SidebarTab {
	id: string;
	label: string;
	icon: IconComponent;
}

interface SidebarTabLayoutProps {
	title: string;
	basePath: string;
	tabs: SidebarTab[];
	defaultTab: string;
	children: (activeTab: string) => React.ReactNode;
}

export default function SidebarTabLayout({
	title,
	basePath,
	tabs,
	defaultTab,
	children,
}: SidebarTabLayoutProps) {
	const t = useThemeClasses();
	const navigate = useNavigate();
	const location = useLocation();

	// Derive active tab from URL: /app/marketing/promos → "promos"
	const pathSegments = location.pathname.replace(basePath, "").split("/").filter(Boolean);
	const activeTab = tabs.find((tab) => tab.id === pathSegments[0])?.id || defaultTab;

	const handleTabChange = (tabId: string) => {
		navigate(`${basePath}/${tabId}`, { replace: true });
	};

	return (
		<div
			className={cn(
				"flex h-full overflow-hidden",
				t.isDark ? "bg-gray-900" : "bg-gray-50",
			)}
		>
			{/* Sidebar */}
			<div
				className={cn(
					"w-48 min-w-[200px] border-r flex flex-col",
					t.isDark ? "bg-gray-800" : "bg-white",
					t.border,
				)}
			>
				<div className={cn("p-4 border-b", t.border)}>
					<h1
						className={cn(
							"text-sm font-semibold uppercase tracking-wide",
							t.text,
						)}
					>
						{title}
					</h1>
				</div>
				<nav className="flex-1 overflow-y-auto p-2">
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => handleTabChange(tab.id)}
								className={cn(
									"w-full flex items-center gap-3 px-3 py-2 rounded-md mb-1 transition-all text-left border-none cursor-pointer",
									isActive
										? t.isDark
											? "bg-amber-400/15 text-amber-400 font-medium"
											: "bg-amber-400/10 text-amber-600 font-medium"
										: t.isDark
											? "text-gray-300 hover:bg-gray-700/50"
											: "text-gray-700 hover:bg-gray-100",
								)}
							>
								<Icon size={16} />
								<span className="text-sm">{tab.label}</span>
							</button>
						);
					})}
				</nav>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-6">
				{children(activeTab)}
			</div>
		</div>
	);
}
