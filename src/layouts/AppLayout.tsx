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
  LayoutDashboard,
  ShoppingBag,
  BarChart3,
  Store,
  Wrench,
  Users,
  UserCircle,
  Settings,
  Shield,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  XCircle,
  MessageCircle,
  ChevronDown,
  FileText,
  TrendingUp,
} from "../components/icons";
import { Avatar } from "../components/ui";
import { BranchSelector } from "../components/shared/BranchSelector";
import { settlementsApi } from "../services/api/settlements";
import { useWalkthroughStore } from "../stores/walkthroughStore";
import { WalkthroughTooltip } from "../components/shared/WalkthroughTooltip";
import { useWhatsAppStore } from "../stores/whatsappStore";
import { usePermissions, PERMISSIONS } from "../hooks/usePermissions";

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const { selectedBranch, clearBranch } = useBranchStore();
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
  const { chats, isConnected, ensureStatusChecked } = useWhatsAppStore();

  const { isManager, isClerk, hasPermission } = usePermissions();
  const hasBranchSelected = Boolean(selectedBranch);
  const [isBranchSectionOpen, setIsBranchSectionOpen] = useState(true);

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

  const { generalItems, branchItems } = useMemo(() => {
    const general: Array<{
      path: string;
      label: string;
      icon: typeof LayoutDashboard;
      badge?: number;
      hasAlert?: boolean;
    }> = [];
    const branch: Array<{
      path: string;
      label: string;
      icon: typeof LayoutDashboard;
      badge?: number;
      hasAlert?: boolean;
    }> = [];

    const unreadMessagesCount = isConnected
      ? chats.reduce((sum, chat) => sum + chat.unreadCount, 0)
      : 0;

    if (isManager) {
      // ─── Manager: General Navigation (always visible) ─────────────
      general.push({
        path: "/app/overview",
        label: "Overview",
        icon: BarChart3,
      });
      general.push({ path: "/app/branches", label: "Branches", icon: Store });
      general.push({
        path: "/app/user-management",
        label: "User Management",
        icon: Users,
      });
      general.push({
        path: "/app/marketing",
        label: "Marketing",
        icon: TrendingUp,
      });
      general.push({
        path: "/app/messages",
        label: "Messages",
        icon: MessageCircle,
        badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      });

      // ─── Manager: Branch-specific Navigation (when branch selected) ─
      if (hasBranchSelected) {
        branch.push({
          path: "/app/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        });
        branch.push({
          path: "/app/jobs",
          label: "Jobs",
          icon: ShoppingBag,
          badge: pendingAndPaidCount > 0 ? pendingAndPaidCount : undefined,
        });
        branch.push({
          path: "/app/services",
          label: "Services",
          icon: Wrench,
        });
        branch.push({
          path: "/app/access-control",
          label: "Access Control",
          icon: Shield,
        });
        branch.push({
          path: "/app/reports",
          label: "Reports",
          icon: FileText,
        });
        branch.push({
          path: "/app/branch-info",
          label: "Branch Info",
          icon: Store,
          hasAlert: !!hasNoPaymentMethod,
        });
      }
    } else if (isClerk) {
      // ─── Clerk Navigation (permission-gated, no branch section) ───
      if (hasPermission(PERMISSIONS.DASHBOARD_VIEW)) {
        general.push({
          path: "/app/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        });
      }
      if (hasPermission(PERMISSIONS.ORDERS_VIEW)) {
        general.push({
          path: "/app/orders",
          label: "Orders",
          icon: ShoppingBag,
          badge: pendingAndPaidCount > 0 ? pendingAndPaidCount : undefined,
        });
      }
      if (hasPermission(PERMISSIONS.MESSAGES_VIEW)) {
        general.push({
          path: "/app/messages",
          label: "Messages",
          icon: MessageCircle,
          badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
        });
      }
      if (hasPermission(PERMISSIONS.SERVICES_VIEW)) {
        general.push({
          path: "/app/services",
          label: "Services",
          icon: Wrench,
        });
      }
      if (
        hasPermission(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.DASHBOARD_ANALYTICS)
      ) {
        general.push({
          path: "/app/overview",
          label: "Analytics",
          icon: BarChart3,
        });
      }
      if (hasPermission(PERMISSIONS.REPORTS_VIEW)) {
        general.push({
          path: "/app/reports",
          label: "Reports",
          icon: FileText,
        });
      }
      if (hasPermission(PERMISSIONS.BRANCH_VIEW)) {
        general.push({
          path: "/app/branch-info",
          label: "Branch",
          icon: Store,
        });
      }
      if (hasPermission(PERMISSIONS.ACTIVITY_VIEW)) {
        general.push({
          path: "/app/access-control",
          label: "Activity Log",
          icon: Shield,
        });
      }
    }

    // Always available to all roles
    general.push({
      path: "/app/profile",
      label: "Profile",
      icon: UserCircle,
    });
    general.push({
      path: "/app/settings",
      label: "Settings",
      icon: Settings,
    });

    return { generalItems: general, branchItems: branch };
  }, [
    isManager,
    isClerk,
    hasBranchSelected,
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

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto",
            isSidebarCollapsed ? "p-2 space-y-1" : "p-4 space-y-1",
          )}
        >
          {/* General nav items */}
          {generalItems.map((item) => {
            const Icon = item.icon;
            const isActiveRoute = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <div key={item.path} className="relative group">
                <button
                  id={
                    item.label === "Branches"
                      ? "walkthrough-branches-nav"
                      : undefined
                  }
                  onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center rounded-lg transition-all relative",
                    isSidebarCollapsed
                      ? "justify-center p-2.5"
                      : "gap-3 px-3 py-2.5",
                    isActiveRoute
                      ? "bg-amber-400 text-gray-900 font-semibold shadow-sm"
                      : t.isDark
                        ? "text-gray-400 hover:bg-gray-700/60 hover:text-gray-200"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <Icon size={20} active={isActiveRoute} />
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="text-sm truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={cn(
                            "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center",
                            isActiveRoute
                              ? "bg-gray-900 text-amber-400"
                              : "bg-amber-400 text-gray-900",
                          )}
                        >
                          {formatCount(item.badge)}
                        </span>
                      )}
                    </div>
                  )}
                  {isSidebarCollapsed &&
                    item.badge !== undefined &&
                    item.badge > 0 && (
                      <span
                        className={cn(
                          "absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold",
                          isActiveRoute
                            ? "bg-gray-900 text-amber-400"
                            : "bg-amber-400 text-gray-900",
                        )}
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                </button>
                {isSidebarCollapsed && (
                  <div
                    className={cn(
                      "absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none",
                      t.isDark
                        ? "bg-gray-700 text-gray-100 shadow-lg shadow-black/20"
                        : "bg-gray-900 text-white shadow-lg",
                    )}
                  >
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold">
                        {formatCount(item.badge)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Branch-specific section (managers only, when branch selected) */}
          {branchItems.length > 0 && selectedBranch && (
            <>
              {/* Divider */}
              <div className={cn("my-2", isSidebarCollapsed ? "mx-1" : "mx-1")}>
                <div
                  className={cn(
                    "border-t",
                    t.isDark ? "border-gray-700" : "border-gray-200",
                  )}
                />
              </div>

              {/* Branch section header */}
              {!isSidebarCollapsed ? (
                <button
                  onClick={() => setIsBranchSectionOpen(!isBranchSectionOpen)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                    t.isDark
                      ? "hover:bg-gray-700/40 text-gray-300"
                      : "hover:bg-gray-50 text-gray-600",
                  )}
                >
                  <Store size={16} active />
                  <span className="text-xs font-semibold uppercase tracking-wider truncate flex-1 text-left">
                    {selectedBranch.name}
                  </span>
                  <span
                    className={cn(
                      "transition-transform duration-200",
                      isBranchSectionOpen ? "rotate-0" : "-rotate-90",
                    )}
                  >
                    <ChevronDown size={14} />
                  </span>
                </button>
              ) : (
                <div className="relative group">
                  <div className={cn("flex justify-center py-1.5")}>
                    <div
                      className={cn(
                        "w-6 h-0.5 rounded-full",
                        t.isDark ? "bg-gray-600" : "bg-gray-300",
                      )}
                    />
                  </div>
                  <div
                    className={cn(
                      "absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none",
                      t.isDark
                        ? "bg-gray-700 text-gray-100 shadow-lg shadow-black/20"
                        : "bg-gray-900 text-white shadow-lg",
                    )}
                  >
                    {selectedBranch.name}
                  </div>
                </div>
              )}

              {/* Branch nav items (collapsible) */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  isBranchSectionOpen
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0",
                )}
              >
                <div
                  className={cn(
                    isSidebarCollapsed
                      ? "space-y-1"
                      : "space-y-1 ml-1 pl-2 border-l-2 border-amber-400/40",
                  )}
                >
                  {branchItems.map((item) => {
                    const Icon = item.icon;
                    const isActiveRoute = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                    return (
                      <div key={item.path} className="relative group">
                        <button
                          onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center rounded-lg transition-all relative",
                            isSidebarCollapsed
                              ? "justify-center p-2.5"
                              : "gap-3 px-3 py-2.5",
                            isActiveRoute
                              ? "bg-amber-400 text-gray-900 font-semibold shadow-sm"
                              : t.isDark
                                ? "text-gray-400 hover:bg-gray-700/60 hover:text-gray-200"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                          )}
                        >
                          <div className="relative">
                            <Icon size={20} active={isActiveRoute} />
                            {item.hasAlert && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
                            )}
                          </div>
                          {!isSidebarCollapsed && (
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span className="text-sm truncate">
                                {item.label}
                              </span>
                              {item.hasAlert && (
                                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 ml-2" />
                              )}
                              {item.badge !== undefined && item.badge > 0 && (
                                <span
                                  className={cn(
                                    "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center",
                                    isActiveRoute
                                      ? "bg-gray-900 text-amber-400"
                                      : "bg-amber-400 text-gray-900",
                                  )}
                                >
                                  {formatCount(item.badge)}
                                </span>
                              )}
                            </div>
                          )}
                          {isSidebarCollapsed &&
                            item.badge !== undefined &&
                            item.badge > 0 && (
                              <span
                                className={cn(
                                  "absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold",
                                  isActiveRoute
                                    ? "bg-gray-900 text-amber-400"
                                    : "bg-amber-400 text-gray-900",
                                )}
                              >
                                {item.badge > 9 ? "9+" : item.badge}
                              </span>
                            )}
                        </button>
                        {isSidebarCollapsed && (
                          <div
                            className={cn(
                              "absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none",
                              t.isDark
                                ? "bg-gray-700 text-gray-100 shadow-lg shadow-black/20"
                                : "bg-gray-900 text-white shadow-lg",
                            )}
                          >
                            {item.label}
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold">
                                {formatCount(item.badge)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* Branch Selector (for managers) */}
        {isManager && (
          <BranchSelector isSidebarCollapsed={isSidebarCollapsed} />
        )}
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

          {selectedBranch && (
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold", t.text)}>
                {selectedBranch.name}
              </span>
              <button
                onClick={() => {
                  clearBranch();
                  navigate("/app/overview");
                }}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  t.isDark
                    ? "hover:bg-red-900/20 text-red-400 hover:text-red-300"
                    : "hover:bg-red-50 text-red-600 hover:text-red-700",
                )}
                title="Deselect branch"
              >
                <XCircle size={16} />
              </button>
            </div>
          )}

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
          <Outlet />
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
