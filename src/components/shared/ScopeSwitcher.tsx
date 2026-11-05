import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, Layers, Plus, Settings, Check, SpinnerRing } from "../icons";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { useMyBranches, useSwitchBranch } from "../../hooks/useBranchScope";
import { apiService } from "../../services/api";
import type { Branch } from "../../types";

interface ScopeSwitcherProps {
  collapsed: boolean;
  /** Opening the menu from a collapsed sidebar widens it first */
  onExpand: () => void;
}

function BranchMark({ branch, size = 32 }: { branch?: Pick<Branch, "name" | "branchCoverImage"> | null; size?: number }) {
  const t = useThemeClasses();
  const [broken, setBroken] = useState(false);
  const box = { width: size, height: size };
  if (branch?.branchCoverImage && !broken) {
    return (
      <img
        src={branch.branchCoverImage}
        alt=""
        style={box}
        onError={() => setBroken(true)}
        className="rounded-md object-cover flex-shrink-0"
      />
    );
  }
  return (
    <span
      style={box}
      className={cn(
        "rounded-md flex-shrink-0 flex items-center justify-center text-sm font-bold",
        branch ? "bg-amber-400 text-gray-900" : t.isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600",
      )}
    >
      {branch ? branch.name.trim().charAt(0).toUpperCase() : <Layers size={size / 2} />}
    </span>
  );
}

/**
 * The top of the sidebar: which branch the app is looking at. Managers with
 * several branches can pick one or all of them; a one-branch shop just sees its
 * name, and a clerk sees the branch they work in.
 */
export function ScopeSwitcher({ collapsed, onExpand }: ScopeSwitcherProps) {
  const t = useThemeClasses();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { isManager, hasPermission } = usePermissions();
  const { data: branches = [], isLoading } = useMyBranches();
  const { switchTo, switchingTo } = useSwitchBranch();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // A clerk works in one branch; show its name
  const { data: clerkBranch } = useQuery({
    queryKey: ["branch", user?.branch_id],
    queryFn: () => apiService.getBranchById(user!.branch_id!),
    enabled: !isManager && !!user?.branch_id,
    staleTime: 300000,
  });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // Moving to another page closes the menu
  useEffect(() => setOpen(false), [pathname]);

  const several = branches.length > 1;
  const current = isManager ? selectedBranch : clerkBranch;
  const title = current?.name ?? (isManager ? (several ? "All branches" : isLoading ? "Loading…" : "No branch yet") : "Your branch");
  const subtitle = isManager
    ? current
      ? several
        ? `1 of ${branches.length} branches`
        : current.location?.address || "Your shop"
      : several
        ? `${branches.length} branches combined`
        : "Add one to start selling"
    : "Clerk";

  const pick = async (branch: Branch | null) => {
    await switchTo(branch);
    setOpen(false);
  };

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const shown = branches.filter((b) => {
    const q = query.trim().toLowerCase();
    return !q || b.name.toLowerCase().includes(q) || b.location?.address?.toLowerCase().includes(q);
  });

  const row = (active: boolean) =>
    cn(
      "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
      active
        ? t.isDark ? "bg-gray-700/60" : "bg-gray-100"
        : t.isDark ? "hover:bg-gray-700/40" : "hover:bg-gray-50",
    );

  const canOpen = isManager && !isLoading;

  return (
    <div ref={ref} className={cn("relative border-b", t.border, collapsed ? "p-2" : "p-3")}>
      <button
        type="button"
        onClick={() => {
          if (!canOpen) return;
          if (collapsed) onExpand();
          setQuery("");
          setOpen((o) => !o);
        }}
        aria-haspopup={canOpen ? "menu" : undefined}
        aria-expanded={canOpen ? open : undefined}
        title={collapsed ? title : undefined}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-lg text-left transition-colors",
          collapsed ? "justify-center p-1" : "p-2",
          canOpen ? (t.isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-100") : "cursor-default",
        )}
      >
        <BranchMark branch={current} />
        {!collapsed && (
          <>
            <span className="flex-1 min-w-0">
              <span className={cn("block text-sm font-semibold truncate", t.text)}>{title}</span>
              <span className={cn("block text-xs truncate", t.textTertiary)}>{subtitle}</span>
            </span>
            {switchingTo ? (
              <SpinnerRing size={16} />
            ) : (
              canOpen && (
                <ChevronDown size={14} className={cn("transition-transform", t.textTertiary, open && "rotate-180")} />
              )
            )}
          </>
        )}
      </button>

      {open && !collapsed && (
        <div
          role="menu"
          className={cn(
            "absolute left-3 right-3 top-full mt-1 z-[1000] rounded-lg border shadow-xl overflow-hidden",
            t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
          )}
        >
          {branches.length > 5 && (
            <div className={cn("p-2 border-b", t.border)}>
              <div className="relative">
                <Search size={14} className={cn("absolute left-2.5 top-1/2 -translate-y-1/2", t.textTertiary)} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                  placeholder="Find a branch"
                  className={cn("w-full pl-8 pr-2 py-1.5 rounded-md border text-sm outline-none", t.input)}
                />
              </div>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto py-1">
            {several && !query && (
              <button type="button" role="menuitem" onClick={() => pick(null)} className={row(!selectedBranch)}>
                <BranchMark branch={null} size={28} />
                <span className="flex-1 min-w-0">
                  <span className={cn("block font-medium", t.text)}>All branches</span>
                  <span className={cn("block text-xs", t.textTertiary)}>Totals and a side-by-side view</span>
                </span>
                {switchingTo === "all" ? <SpinnerRing size={14} /> : !selectedBranch && <Check size={16} className="text-amber-500" />}
              </button>
            )}
            {shown.map((b) => (
              <button key={b.id} type="button" role="menuitem" onClick={() => pick(b)} className={row(selectedBranch?.id === b.id)}>
                <BranchMark branch={b} size={28} />
                <span className="flex-1 min-w-0">
                  <span className={cn("block font-medium truncate", t.text)}>{b.name}</span>
                  {b.location?.address && (
                    <span className={cn("block text-xs truncate", t.textTertiary)}>{b.location.address}</span>
                  )}
                </span>
                {switchingTo === b.id ? (
                  <SpinnerRing size={14} />
                ) : (
                  selectedBranch?.id === b.id && <Check size={16} className="text-amber-500" />
                )}
              </button>
            ))}
            {shown.length === 0 && (
              <p className={cn("px-3 py-4 text-sm text-center", t.textTertiary)}>
                {query ? "No branch matches" : "You haven't added a branch yet"}
              </p>
            )}
          </div>

          <div className={cn("border-t py-1", t.border)}>
            {hasPermission(PERMISSIONS.BRANCH_CREATE) && (
              <button type="button" role="menuitem" onClick={() => go("/app/branches/create")} className={row(false)}>
                <Plus size={16} className={t.textSecondary} />
                <span className={t.text}>Add a branch</span>
              </button>
            )}
            {several && (
              <button type="button" role="menuitem" onClick={() => go("/app/branches")} className={row(false)}>
                <Settings size={16} className={t.textSecondary} />
                <span className={t.text}>Manage branches</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
