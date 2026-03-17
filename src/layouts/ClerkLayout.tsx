import { useState, useMemo, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import { useBranchStore } from "../stores/branchStore";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { useToast } from "../contexts/ToastContext";
import { apiService } from "../services/api";
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
  CreditCard,
} from "../components/icons";
import { BranchSelector } from "../components/shared/BranchSelector";
import { useWalkthroughStore } from "../stores/walkthroughStore";
import { WalkthroughTooltip } from "../components/shared/WalkthroughTooltip";
import { useWhatsAppStore } from "../stores/whatsappStore";
import { usePermissions, PERMISSIONS } from "../hooks/usePermissions";

export default function ClerkLayout() {
  const { user, logout } = useAuthStore();
  const { selectedBranch, clearBranch } = useBranchStore();
  const { theme, toggleTheme } = useTheme();
  const { settings, playSound } = useSettings();
  const { info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { currentStep, isActive, startWalkthrough, setStep } =
    useWalkthroughStore();
  const { chats, isConnected, ensureStatusChecked } = useWhatsAppStore();

  const { isManager, isClerk, hasPermission } = usePermissions();
  const hasBranchSelected = Boolean(selectedBranch);

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
      location.pathname === "/clerk/branches" &&
      currentStep === "sidebar-branches"
    ) {
      setStep("branches-create");
    } else if (
      location.pathname === "/clerk/branches/create" &&
      currentStep === "branches-create"
    ) {
      setStep("create-branch-form");
    }
  }, [location.pathname, isActive, currentStep, setStep]);

  // Determine which branch_id to use for fetching orders
  const branchIdForOrders = isClerk ? user?.branch_id : selectedBranch?.id;

  // Fetch orders to get PENDING and PAID count
  const { data: orders = [] } = useQuery({
    queryKey: ["branchOrders", branchIdForOrders],
    queryFn: async () => {
      if (!branchIdForOrders) return [];
      return await apiService.getBranchOrders(branchIdForOrders);
    },
    enabled: !!branchIdForOrders && (isManager || isClerk),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Calculate PENDING and PAID jobs count
  const pendingAndPaidCount = useMemo(() => {
    return orders.filter(
      (order) => order.status === "PENDING" || order.status === "PAID",
    ).length;
  }, [orders]);

  // Get PENDING and PAID orders
  const pendingAndPaidOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === "PENDING" || order.status === "PAID",
    );
  }, [orders]);

  // Play sound notification every 1 minute when there are PENDING or PAID jobs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingAndPaidOrdersRef = useRef(pendingAndPaidOrders);
  const settingsRef = useRef(settings);

  // Keep refs up to date
  useEffect(() => {
    pendingAndPaidOrdersRef.current = pendingAndPaidOrders;
    settingsRef.current = settings;
  }, [pendingAndPaidOrders, settings]);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only set up interval if:
    // 1. Sounds are enabled
    // 2. Job notification sound is enabled
    // 3. There are PENDING or PAID orders
    if (
      settings.sounds.enabled &&
      settings.sounds.jobNotificationEnabled &&
      pendingAndPaidOrders.length > 0
    ) {
      // Set up interval to play sound every 1 minute (60000ms)
      // Note: Sound will only play if user has interacted with the page
      // (handled by SettingsContext)
      intervalRef.current = setInterval(() => {
        // Check again if conditions are still met using refs for latest values
        if (
          settingsRef.current.sounds.enabled &&
          settingsRef.current.sounds.jobNotificationEnabled &&
          pendingAndPaidOrdersRef.current.length > 0
        ) {
          playSound("job");
        }
      }, 60000); // 1 minute
    }

    // Cleanup interval on unmount or when dependencies change
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

  const navItems = useMemo(() => {
    const items = [];

    const unreadMessagesCount = isConnected
      ? chats.reduce((sum, chat) => sum + chat.unreadCount, 0)
      : 0;

    if (isManager) {
      // ─── Manager Navigation ───────────────────────────────────────
      if (hasBranchSelected) {
        items.push({ path: "/clerk/dashboard", label: "Dashboard", icon: LayoutDashboard });
        items.push({ path: "/clerk/jobs", label: "Jobs", icon: ShoppingBag, badge: pendingAndPaidCount > 0 ? pendingAndPaidCount : undefined });
        items.push({ path: "/clerk/messages", label: "Messages", icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined });
        items.push({ path: "/clerk/services", label: "Services", icon: Wrench });
        items.push({ path: "/clerk/access-control", label: "Access Control", icon: Shield });
      } else {
        items.push({ path: "/clerk/overview", label: "Overview", icon: BarChart3 });
        items.push({ path: "/clerk/branches", label: "Branches", icon: Store });
        items.push({ path: "/clerk/user-management", label: "User Management", icon: Users });
        items.push({ path: "/clerk/billing", label: "Billing", icon: CreditCard });
      }
    } else if (isClerk) {
      // ─── Clerk Navigation (permission-gated) ──────────────────────
      if (hasPermission(PERMISSIONS.DASHBOARD_VIEW)) {
        items.push({ path: "/clerk/dashboard", label: "Dashboard", icon: LayoutDashboard });
      }
      if (hasPermission(PERMISSIONS.ORDERS_VIEW)) {
        items.push({ path: "/clerk/orders", label: "Orders", icon: ShoppingBag, badge: pendingAndPaidCount > 0 ? pendingAndPaidCount : undefined });
      }
      if (hasPermission(PERMISSIONS.MESSAGES_VIEW)) {
        items.push({ path: "/clerk/messages", label: "Messages", icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined });
      }
      if (hasPermission(PERMISSIONS.SERVICES_VIEW)) {
        items.push({ path: "/clerk/services", label: "Services", icon: Wrench });
      }
      if (hasPermission(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.DASHBOARD_ANALYTICS)) {
        items.push({ path: "/clerk/overview", label: "Analytics", icon: BarChart3 });
      }
      if (hasPermission(PERMISSIONS.BRANCH_VIEW)) {
        items.push({ path: "/clerk/branch-info", label: "Branch", icon: Store });
      }
      if (hasPermission(PERMISSIONS.ACTIVITY_VIEW)) {
        items.push({ path: "/clerk/access-control", label: "Activity Log", icon: Shield });
      }
    }

    // Always available to all roles
    items.push({ path: "/clerk/profile", label: "Profile", icon: UserCircle });
    items.push({ path: "/clerk/settings", label: "Settings", icon: Settings });

    return items;
  }, [
    isManager,
    isClerk,
    hasBranchSelected,
    hasPermission,
    pendingAndPaidCount,
    isConnected,
    chats,
  ]);

  const handleLogout = async () => {
    await logout();
    info("You have been logged out successfully", "Logged Out", 3000);
    navigate("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarCollapsed ? "w-16" : "w-64"
        } transition-all duration-200 flex flex-col ${
          theme === "dark"
            ? "bg-gray-800 border-r border-gray-700"
            : "bg-white border-r border-gray-200"
        }`}
      >
        {/* Sidebar Header */}
        <div
          className={`h-16 flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} px-4 border-b ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
        >
          {!isSidebarCollapsed && (
            <h1
              className={`text-xl font-bold ${
                theme === "dark" ? "text-gray-100" : "text-gray-900"
              }`}
            >
              Print Agent
            </h1>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto space-y-1 ${isSidebarCollapsed ? "p-2" : "p-4 space-y-2"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <div key={item.path} className="relative group">
                <button
                  id={
                    item.label === "Branches"
                      ? "walkthrough-branches-nav"
                      : undefined
                  }
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center rounded-lg transition-all relative ${
                    isSidebarCollapsed
                      ? "justify-center p-2.5"
                      : "gap-3 px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-amber-400 text-gray-900 font-semibold shadow-sm"
                      : theme === "dark"
                        ? "text-gray-400 hover:bg-gray-700/60 hover:text-gray-200"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={20} active={isActive} />
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="text-sm truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center ${
                            isActive
                              ? "bg-gray-900 text-amber-400"
                              : "bg-amber-400 text-gray-900"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Badge dot when collapsed */}
                  {isSidebarCollapsed &&
                    item.badge !== undefined &&
                    item.badge > 0 && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold ${
                          isActive
                            ? "bg-gray-900 text-amber-400"
                            : "bg-amber-400 text-gray-900"
                        }`}
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                </button>
                {/* Tooltip on hover when collapsed */}
                {isSidebarCollapsed && (
                  <div
                    className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-100 shadow-lg shadow-black/20"
                        : "bg-gray-900 text-white shadow-lg"
                    }`}
                  >
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
          className={`h-16 flex items-center justify-between px-6 border-b ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          {selectedBranch && (
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold ${
                  theme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}
              >
                {selectedBranch.name}
              </span>
              <button
                onClick={() => {
                  clearBranch();
                  navigate("/clerk/overview");
                }}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === "dark"
                    ? "hover:bg-red-900/20 text-red-400 hover:text-red-300"
                    : "hover:bg-red-50 text-red-600 hover:text-red-700"
                }`}
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
              className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-100"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  {getInitials(user?.name || user?.firstName || user?.email)}
                </div>
                {!isSidebarCollapsed && (
                  <span className="text-sm">
                    {user?.name || user?.firstName || "User"}
                  </span>
                )}
              </button>

              {isUserMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 z-[9999999] w-48 rounded-md shadow-lg ${
                    theme === "dark"
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div
                    className={`p-3 border-b ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        theme === "dark" ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      {user?.name || user?.firstName || "User"}
                    </p>
                    <p
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
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
