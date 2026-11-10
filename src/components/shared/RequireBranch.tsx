import { useNavigate } from "react-router-dom";
import { Store, SpinnerRing, Plus } from "../icons";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { useMyBranches, useSwitchBranch } from "../../hooks/useBranchScope";

/**
 * Shown in place of a page that works on one branch while the manager is
 * looking at all of them. Picking a branch opens the page for it.
 */
export function RequireBranch() {
  const t = useThemeClasses();
  const navigate = useNavigate();
  const { data: branches = [], isLoading } = useMyBranches();
  const { switchTo, switchingTo } = useSwitchBranch();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <SpinnerRing size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="text-center mb-6">
        <h2 className={cn("text-lg font-semibold", t.text)}>
          {branches.length ? "Choose a branch" : "Add your first branch"}
        </h2>
        <p className={cn("text-sm mt-1", t.textSecondary)}>
          {branches.length
            ? "This page works on one branch at a time. You can switch any time from the top of the menu."
            : "Orders, prices and settings belong to a branch. Set one up to get started."}
        </p>
      </div>

      {branches.length ? (
        <div className={cn("rounded-xl border divide-y overflow-hidden", t.surface, t.border, t.isDark ? "divide-gray-700" : "divide-gray-200")}>
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={!!switchingTo}
              onClick={() => switchTo(b)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-60",
                t.isDark ? "hover:bg-gray-700/40" : "hover:bg-gray-50",
              )}
            >
              <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center", t.isDark ? "bg-gray-700" : "bg-gray-100")}>
                <Store size={18} className={t.textSecondary} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={cn("block text-sm font-medium truncate", t.text)}>{b.name}</span>
                {b.location?.address && (
                  <span className={cn("block text-xs truncate", t.textTertiary)}>{b.location.address}</span>
                )}
              </span>
              {switchingTo === b.id && <SpinnerRing size={16} />}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/app/branches/create")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 text-gray-900 text-sm font-semibold hover:bg-amber-300"
          >
            <Plus size={16} /> Add a branch
          </button>
        </div>
      )}
    </div>
  );
}
