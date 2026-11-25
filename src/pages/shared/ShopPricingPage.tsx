import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { usePermissions } from "../../hooks/usePermissions";
import { Badge, Button, Card, EmptyState, PageHeader } from "../../components/ui";
import { Layers, Plus, Search, Sparkles, Tag, Upload } from "../../components/icons";
import { pricingError, shopPricingApi, UNIT_LABEL, type OwnProductRow } from "../../services/api/shopPricing";
import { OwnProductEditor } from "./pricing/OwnProductEditor";
import { PricingAssistant } from "./pricing/PricingAssistant";
import { CategoriesPanel } from "./pricing/CategoriesPanel";

/**
 * The shop's services and their prices. Each service is the shop's own: add
 * one by hand, or let the AI read an Excel price list. Saving puts it live.
 */
export default function ShopPricingPage() {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { isClerk } = usePermissions();
  const t = useThemeClasses();
  const branchId: string | undefined = isClerk ? user?.branch_id : selectedBranch?.id;
  const canEdit = !isClerk;

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ["shopPricing", branchId, "ownProducts"],
    queryFn: () => shopPricingApi.ownProducts(branchId!),
    enabled: !!branchId,
  });
  /** undefined = closed, null = a new service */
  const [editing, setEditing] = useState<OwnProductRow | null | undefined>(undefined);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const rows = services.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
    const byCategory = new Map<string, OwnProductRow[]>();
    for (const r of rows) byCategory.set(r.category, [...(byCategory.get(r.category) ?? []), r]);
    return [...byCategory.entries()];
  }, [services, search]);

  if (!branchId) {
    return (
      <div className="p-6">
        <PageHeader title="Pricing" description="Choose a branch to set its prices" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Pricing"
        description="What your shop prints and what it costs. Changes go live as soon as you save."
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Layers} onClick={() => setCategoriesOpen(true)}>Categories</Button>
              <Button variant="secondary" icon={Plus} onClick={() => setEditing(null)}>New service</Button>
              <Button icon={Sparkles} onClick={() => setAssistantOpen(true)}>Set up with AI</Button>
            </div>
          ) : undefined
        }
      />

      {canEdit && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          className={cn(
            "w-full text-left rounded-2xl border p-4 sm:p-5 flex items-center gap-4 transition-shadow hover:shadow-md",
            t.isDark ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent" : "border-amber-200 bg-gradient-to-r from-amber-50 to-white",
          )}
        >
          <span className="w-11 h-11 rounded-xl bg-amber-400 text-gray-900 flex items-center justify-center shrink-0"><Sparkles size={22} /></span>
          <span className="flex-1 min-w-0">
            <span className={cn("block text-sm font-semibold", t.text)}>
              {services.length ? "Add more services or update prices with AI" : "Let AI set up your services and prices"}
            </span>
            <span className={cn("block text-xs mt-0.5", t.textSecondary)}>
              Upload your Excel price list or just describe what you print. The assistant builds your services and prices — you check them before they go live.
            </span>
          </span>
          <span className={cn("hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-2", t.isDark ? "bg-gray-800 text-amber-300" : "bg-white text-amber-700 border border-amber-200")}>
            <Upload size={14} /> Upload price list
          </span>
        </button>
      )}

      {services.length > 5 && (
        <div className="relative max-w-sm">
          <Search size={16} className={cn("absolute left-3 top-1/2 -translate-y-1/2", t.textTertiary)} />
          <input
            className={cn("w-full pl-9 pr-3 py-2 rounded-lg border text-sm", t.input)}
            placeholder="Search services"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{pricingError(error).message}</p>
      ) : services.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No services yet"
          description="Add what you print — by hand with “New service”, or upload your price list and let AI do it."
        />
      ) : groups.length === 0 ? (
        <p className={cn("text-sm", t.textSecondary)}>None match your search.</p>
      ) : (
        groups.map(([category, rows]) => (
          <div key={category}>
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-1.5", t.textSecondary)}>{category}</p>
            <Card padding="none">
              <div className={cn("divide-y", t.isDark ? "divide-gray-700" : "divide-gray-100")}>
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", t.text)}>{r.name}</p>
                      <p className={cn("text-xs", t.textSecondary)}>
                        {[r.subCategory, r.pricingUnit && `Priced ${UNIT_LABEL[r.pricingUnit]}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {r.onSale ? <Badge color="green">On sale</Badge> : <Badge color="amber">Needs a price</Badge>}
                    <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>{canEdit ? "Edit" : "View"}</Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))
      )}

      {editing !== undefined && <OwnProductEditor branchId={branchId} row={editing} canEdit={canEdit} onClose={() => setEditing(undefined)} />}
      {assistantOpen && <PricingAssistant branchId={branchId} onClose={() => setAssistantOpen(false)} />}
      {categoriesOpen && <CategoriesPanel branchId={branchId} canEdit={canEdit} onClose={() => setCategoriesOpen(false)} />}
    </div>
  );
}
