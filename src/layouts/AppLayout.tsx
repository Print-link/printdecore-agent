import { useState, useMemo, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import { useBranchStore } from "../stores/branchStore";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeClasses } from "../lib/theme";
import { cn, formatCount } from "../lib/utils";
import { useSettings } from "../contexts/SettingsContext";
import { useToast } from "../contexts/ToastContext";
import { apiService } from "../services/api";
import { branchApi } from "../services/api/branches";
import {
  Home,
  ShoppingBag,
  Store,
  Building,
  Palette,
  Tag,
  Users,
  UserCircle,
  Settings,
  Shield,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  MessageCircle,
  FileText,
  TrendingUp,
} from "../components/icons";
import { Avatar } from "../components/ui";
import { ScopeSwitcher } from "../components/shared/ScopeSwitcher";
import { RequireBranch } from "../components/shared/RequireBranch";
import { useAutoScope, isBranchOnlyPath } from "../hooks/useBranchScope";
import { settlementsApi } from "../services/api/settlements";
import { useWalkthroughStore } from "../stores/walkthroughStore";
import { WalkthroughTooltip } from "../components/shared/WalkthroughTooltip";
import { useWhatsAppStore } from "../stores/whatsappStore";
import { usePermissions, PERMISSIONS } from "../hooks/usePermissions";

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  /** Other paths that light this item up */
  also?: string[];
  badge?: number;
  hasAlert?: boolean;
  id?: string;
}

interface NavSection {
  title?: string;
  items: Array<NavItem | false>;
}

const isOn = (pathname: string, item: Pick<NavItem, "path" | "also">) =>
  [item.path, ...(item.also ?? [])].some((p) => pathname === p || pathname.startsWith(p + "/"));

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { theme, toggleTheme } = useTheme();
  const t = useThemeClasses();
  const { settings, playSound } = useSettings();
  const { info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { currentStep, isActive, startWalkthrough, setStep } =
    useWalkthroughStore();
  const {
    chats,
    isConnected,
    isConnecting: whatsAppConnecting,
    statusKnown: whatsAppStatusKnown,
    wasLinked: whatsAppWasLinked,
    ensureStatusChecked,
    connect: connectWhatsApp,
  } = useWhatsAppStore();

  const { isManager, isClerk, hasPermission } = usePermissions();
  const hasBranchSelected = Boolean(selectedBranch);
  useAutoScope();

  // Check if branch has payment method configured
  const { data: settlementData } = useQuery({
    queryKey: ["settlement", selectedBranch?.id],
    queryFn: () => settlementsApi.getSettlementDetails(selectedBranch!.id),
    enabled: !!selectedBranch?.id && isManager,
    staleTime: 60000,
  });
  // Payouts only matter for shops that sell to customers directly (self-managed)
  const { data: marketplaceStatus } = useQuery({
    queryKey: ["branchMarketplace", selectedBranch?.id],
    queryFn: () => branchApi.getMarketplaceStatus(selectedBranch!.id),
    enabled: !!selectedBranch?.id && isManager,
    staleTime: 60000,
  });
  const hasNoPaymentMethod =
    isManager &&
    hasBranchSelected &&
    marketplaceStatus?.fulfilmentMode === "self_managed" &&
    settlementData &&
    !settlementData.configured;

  // Start walkthrough on login for managers
  useEffect(() => {
    if (user && isManager) {
      startWalkthrough();
    }
  }, [user, isManager, startWalkthrough]);

  // Run WhatsApp status check once when clerk layout mounts (user is authenticated)
  useEffect(() => {
    ensureStatusChecked();
  }, [ensureStatusChecked]);

  // Sync walkthrough step with URL for smoother experience
  useEffect(() => {
    if (!isActive) return;

    if (
      location.pathname === "/app/branches" &&
      currentStep === "sidebar-branches"
    ) {
      setStep("branches-create");
    } else if (
      location.pathname === "/app/branches/create" &&
      currentStep === "branches-create"
    ) {
      setStep("create-branch-form");
    }
  }, [location.pathname, isActive, currentStep, setStep]);

  // Determine which branch_id to use for fetching orders
  const branchIdForOrders = isClerk ? user?.branch_id : selectedBranch?.id;

  // Fetch orders to get PENDING and PAID count — poll every 15s for fast detection
  const { data: orders = [] } = useQuery({
    queryKey: ["branchOrders", branchIdForOrders],
    queryFn: async () => {
      if (!branchIdForOrders) return [];
      return await apiService.getBranchOrders(branchIdForOrders);
    },
    enabled: !!branchIdForOrders && (isManager || isClerk),
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // Orders waiting on this shop: paid and not yet accepted. Unpaid (PENDING)
  // orders are still with Printdecore or the customer, so they don't ring.
  const pendingAndPaidOrders = useMemo(() => {
    return orders.filter((order) => order.status === "PAID");
  }, [orders]);
  const pendingAndPaidCount = pendingAndPaidOrders.length;

  // Play sound notification when PENDING/PAID orders exist
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef(0);
  const pendingAndPaidOrdersRef = useRef(pendingAndPaidOrders);
  const settingsRef = useRef(settings);

  // Keep refs up to date
  useEffect(() => {
    pendingAndPaidOrdersRef.current = pendingAndPaidOrders;
    settingsRef.current = settings;
  }, [pendingAndPaidOrders, settings]);

  // Play sound IMMEDIATELY when new orders arrive (count increases)
  useEffect(() => {
    const currentCount = pendingAndPaidOrders.length;
    if (
      currentCount > prevCountRef.current &&
      prevCountRef.current >= 0 &&
      settings.sounds.enabled &&
      settings.sounds.jobNotificationEnabled
    ) {
      playSound("job");
    }
    prevCountRef.current = currentCount;
  }, [pendingAndPaidOrders.length, settings.sounds.enabled, settings.sounds.jobNotificationEnabled, playSound]);

  // Repeat alarm every 30s while unhandled orders exist
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (
      settings.sounds.enabled &&
      settings.sounds.jobNotificationEnabled &&
      pendingAndPaidOrders.length > 0
    ) {
      intervalRef.current = setInterval(() => {
        if (
          settingsRef.current.sounds.enabled &&
          settingsRef.current.sounds.jobNotificationEnabled &&
          pendingAndPaidOrdersRef.current.length > 0
        ) {
          playSound("job");
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    settings.sounds.enabled,
    settings.sounds.jobNotificationEnabled,
    pendingAndPaidOrders.length,
    playSound,
  ]);

  const sections = useMemo(() => {
    const unreadMessagesCount = isConnected
      ? chats.reduce((sum, chat) => sum + chat.unreadCount, 0)
      : 0;
    const ordersBadge = pendingAndPaidCount > 0 ? pendingAndPaidCount : undefined;
    const messagesBadge = unreadMessagesCount > 0 ? unreadMessagesCount : undefined;
    const can = (...p: Parameters<typeof hasPermission>) => isManager || hasPermission(...p);

    // One menu for every branch; pages that need a single branch ask for one
    const all: NavSection[] = [
      {
        items: [
          { path: "/app/home", label: "Home", icon: Home, id: "walkthrough-dashboard-welcome" },
          can(PERMISSIONS.ORDERS_VIEW) && {
            path: "/app/orders",
            also: ["/app/jobs"],
            label: "Orders",
            icon: ShoppingBag,
            badge: ordersBadge,
          },
          can(PERMISSIONS.MESSAGES_VIEW) && {
            path: "/app/messages",
            label: "Messages",
            icon: MessageCircle,
            badge: messagesBadge,
          },
        ],
      },
      {
        title: "Sell",
        items: [
          can(PERMISSIONS.SERVICES_VIEW) && { path: "/app/pricing", label: "Products and prices", icon: Tag },
          can(PERMISSIONS.SERVICES_VIEW) && { path: "/app/artworks", label: "Art works", icon: Palette },
          isManager && { path: "/app/marketing", label: "Marketing", icon: TrendingUp },
          can(PERMISSIONS.REPORTS_VIEW) && { path: "/app/reports", label: "Reports", icon: FileText },
        ],
      },
      {
        title: "Manage",
        items: [
          isManager && { path: "/app/user-management", label: "Team", icon: Users },
          (isManager || hasPermission(PERMISSIONS.ACTIVITY_VIEW)) && {
            path: "/app/access-control",
            label: isManager ? "Roles and activity" : "Activity log",
            icon: Shield,
          },
          isManager && {
            path: "/app/branches",
            label: "Branches",
            icon: Store,
            id: "walkthrough-branches-nav",
          },
          can(PERMISSIONS.BRANCH_VIEW) && {
            path: "/app/branch-info",
            label: "Shop settings",
            icon: Building,
            hasAlert: !!hasNoPaymentMethod,
          },
        ],
      },
    ];
    return all
      .map((sec) => ({ ...sec, items: sec.items.filter(Boolean) as NavItem[] }))
      .filter((sec) => sec.items.length > 0);
  }, [
    isManager,
    hasPermission,
    pendingAndPaidCount,
    isConnected,
    chats,
    hasNoPaymentMethod,
  ]);

  const handleLogout = async () => {
    await logout();
    info("You have been logged out successfully", "Logged Out", 3000);
    navigate("/login");
  };

  return (
    <div className={cn("flex h-screen overflow-hidden", t.surfaceInset)}>
      {/* Mobile overlay backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, shown as overlay when menu open */}
      <aside
        className={cn(
          isSidebarCollapsed ? "md:w-16" : "md:w-64",
          "transition-all duration-200 flex flex-col border-r",
          t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
          // Mobile: fixed overlay drawer
          "fixed inset-y-0 left-0 z-50 w-64",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static md:z-auto",
        )}
      >
        {/* Sidebar Header */}
        <div
          className={cn(
            "h-16 flex items-center px-4 border-b",
            isSidebarCollapsed ? "justify-center" : "justify-between",
            t.border,
          )}
        >
          {!isSidebarCollapsed && (
            <h1 className={cn("text-xl font-bold", t.text)}>Print Agent</h1>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "p-2 rounded-md",
              t.isDark
                ? "hover:bg-gray-700 text-gray-300"
                : "hover:bg-gray-100 text-gray-600",
            )}
          >
            {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <ScopeSwitcher
          collapsed={isSidebarCollapsed}
          onExpand={() => setIsSidebarCollapsed(false)}
        />

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto",
            isSidebarCollapsed ? "p-2" : "p-3",
          )}
        >
          {sections.map((section, i) => (
            <div key={section.title ?? i} className={cn(i > 0 && "mt-4")}>
              {section.title &&
                (isSidebarCollapsed ? (
                  <div className={cn("mx-2 mb-2 border-t", t.border)} />
                ) : (
                  <p
                    className={cn(
                      "px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider",
                      t.textTertiary,
                    )}
                  >
                    {section.title}
                  </p>
                ))}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavButton
                    key={item.path}
                    item={item}
                    collapsed={isSidebarCollapsed}
                    active={isOn(location.pathname, item)}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn("border-t", t.border, isSidebarCollapsed ? "p-2" : "p-3")}>
          <NavButton
            item={{ path: "/app/settings", label: "Settings", icon: Settings }}
            collapsed={isSidebarCollapsed}
            active={isOn(location.pathname, { path: "/app/settings" })}
            onClick={() => {
              navigate("/app/settings");
              setIsMobileMenuOpen(false);
            }}
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className={cn(
            "h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b",
            t.isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200",
          )}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              "p-2 rounded-md md:hidden mr-2",
              t.isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600",
            )}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-md",
                t.isDark
                  ? "hover:bg-gray-700 text-gray-300"
                  : "hover:bg-gray-100 text-gray-600",
              )}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md",
                  t.isDark
                    ? "hover:bg-gray-700 text-gray-300"
                    : "hover:bg-gray-100 text-gray-600",
                )}
              >
                <Avatar
                  name={user?.name || user?.firstName || user?.email || "User"}
                  size="sm"
                />
                <span className="text-sm hidden sm:inline">
                  {user?.name || user?.firstName || "User"}
                </span>
              </button>

              {isUserMenuOpen && (
                <div
                  className={cn(
                    "absolute right-0 mt-2 z-[9999999] w-48 rounded-md shadow-lg",
                    t.surface,
                  )}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className={cn("p-3 border-b", t.border)}>
                    <p className={cn("text-sm font-semibold", t.text)}>
                      {user?.name || user?.firstName || "User"}
                    </p>
                    <p className={cn("text-xs", t.textSecondary)}>
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/app/profile")}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm",
                      t.isDark
                        ? "hover:bg-gray-700 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700",
                    )}
                  >
                    <UserCircle size={16} />
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm",
                      t.isDark
                        ? "hover:bg-gray-700 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700",
                    )}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* WhatsApp dropped: customer messages stop until it's back */}
        {whatsAppStatusKnown &&
          whatsAppWasLinked &&
          !isConnected &&
          !whatsAppConnecting &&
          !location.pathname.startsWith("/app/settings/whatsapp") && (
            <div
              role="status"
              className={cn(
                "flex items-center gap-3 px-4 md:px-6 py-2.5 border-b text-sm",
                t.isDark
                  ? "bg-amber-900/20 border-amber-800/40 text-amber-200"
                  : "bg-amber-50 border-amber-200 text-amber-900",
              )}
            >
              <MessageCircle size={16} className="flex-shrink-0 text-amber-500" />
              <span className="font-medium">WhatsApp is disconnected</span>
              <span className={cn("hidden sm:inline", t.isDark ? "text-amber-300/80" : "text-amber-800")}>
                — customer messages won't come in until you reconnect.
              </span>
              <button
                type="button"
                onClick={() => {
                  navigate("/app/settings/whatsapp");
                  connectWhatsApp().catch(() => {});
                }}
                className="ml-auto px-3 py-1 rounded-md text-xs font-semibold bg-amber-400 text-gray-900 hover:bg-amber-300"
              >
                Reconnect
              </button>
            </div>
          )}

        {/* Payment method warning banner */}
        {hasNoPaymentMethod && (
          <div
            className={cn(
              "flex items-center gap-3 px-4 md:px-6 py-2.5 border-b text-sm cursor-pointer transition-colors",
              t.isDark
                ? "bg-red-900/20 border-red-800/40 text-red-300 hover:bg-red-900/30"
                : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
            )}
            onClick={() => navigate("/app/branch-info/marketplace")}
          >
            <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse" />
            <span className="font-medium">
              Payment method not configured
            </span>
            <span className={cn("hidden sm:inline", t.isDark ? "text-red-400" : "text-red-600")}>
              — Customers pay you directly. Add a bank account or mobile money to start selling on Printdecore.
            </span>
            <span className={cn("ml-auto text-xs font-semibold", t.isDark ? "text-red-400" : "text-red-600")}>
              Configure →
            </span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {isManager && !selectedBranch && isBranchOnlyPath(location.pathname) ? (
            <RequireBranch />
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Walkthrough Tooltips */}
      {isManager && (
        <>
          <WalkthroughTooltip
            step="welcome"
            targetId="walkthrough-dashboard-welcome"
            title="Welcome, Manager!"
            content="Let's get you started by setting up your first branch. This dashboard will show you high-level analytics for all your locations."
            position="bottom"
          />
          <WalkthroughTooltip
            step="sidebar-branches"
            targetId="walkthrough-branches-nav"
            title="Manage Your Branches"
            content="Click here to view, edit, or create new branches for your business."
            position="right"
          />
          <WalkthroughTooltip
            step="branches-create"
            targetId="walkthrough-create-branch-btn"
            title="Create Your First Branch"
            content="Click this button to start the guided process of setting up a new branch for your business."
            position="left"
          />
          <WalkthroughTooltip
            step="create-branch-form"
            targetId="walkthrough-branch-form"
            title="Setup Made Easy"
            content="Our smooth multi-step process helps you set up everything from basic info to operating hours in no time."
            position="top"
          />
        </>
      )}
    </div>
  );
}

function NavButton({
  item,
  collapsed,
  active,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const t = useThemeClasses();
  const Icon = item.icon;
  const badge = item.badge !== undefined && item.badge > 0 ? item.badge : undefined;
  return (
    <div className="relative group">
      <button
        id={item.id}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "w-full flex items-center rounded-lg transition-colors relative",
          collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
          active
            ? t.isDark
              ? "bg-gray-700 text-white font-semibold"
              : "bg-gray-100 text-gray-900 font-semibold"
            : t.isDark
              ? "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        )}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-amber-400" />
        )}
        <span className="relative">
          <Icon size={20} active={active} />
          {item.hasAlert && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
          )}
          {collapsed && badge !== undefined && (
            <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full text-[9px] font-bold bg-amber-400 text-gray-900">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="flex items-center justify-between flex-1 min-w-0">
            <span className="text-sm truncate">{item.label}</span>
            {badge !== undefined && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center bg-amber-400 text-gray-900">
                {formatCount(badge)}
              </span>
            )}
          </span>
        )}
      </button>
      {collapsed && (
        <div
          className={cn(
            "absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none",
            t.isDark
              ? "bg-gray-700 text-gray-100 shadow-lg shadow-black/20"
              : "bg-gray-900 text-white shadow-lg",
          )}
        >
          {item.label}
          {badge !== undefined && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold">
              {formatCount(badge)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
