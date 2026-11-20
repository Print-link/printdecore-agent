import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";
import { usePermissions } from "../../hooks/usePermissions";
import { Badge, Button, Card, EmptyState, Modal, PageHeader } from "../../components/ui";
import { Plus, Search, Tag, TrendingUp } from "../../components/icons";
import {
  pricingError,
  shopPricingApi,
  UNIT_LABEL,
  type OwnProductRow,
  type ShopPriceListSummary,
  type ShopProductRow,
} from "../../services/api/shopPricing";
import { ShopProductEditor } from "./pricing/ShopProductEditor";
import { OwnProductEditor } from "./pricing/OwnProductEditor";

/**
 * Everything the shop sells and its prices: Printdecore's products (priced the
 * same as Printdecore, ±%, or from the shop's own list) and products the shop
 * made itself (always from its own list).
 */
export default function ShopPricingPage() {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { isClerk } = usePermissions();
  const t = useThemeClasses();
  const branchId: string | undefined = isClerk ? user?.branch_id : selectedBranch?.id;
  const canEdit = !isClerk;

  const { data, isLoading, error } = useQuery({
    queryKey: ["shopPricing", branchId, "products"],
    queryFn: () => shopPricingApi.products(branchId!),
    enabled: !!branchId,
  });
  const { data: ownProducts = [] } = useQuery({
    queryKey: ["shopPricing", branchId, "ownProducts"],
    queryFn: () => shopPricingApi.ownProducts(branchId!),
    enabled: !!branchId,
  });
  const [editing, setEditing] = useState<ShopProductRow | null>(null);
  /** undefined = closed, null = a new product */
  const [editingOwn, setEditingOwn] = useState<OwnProductRow | null | undefined>(undefined);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const rows = (data?.products ?? []).filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
    const byCategory = new Map<string, ShopProductRow[]>();
    for (const r of rows) byCategory.set(r.category, [...(byCategory.get(r.category) ?? []), r]);
    return [...byCategory.entries()];
  }, [data, search]);
  const shownOwn = ownProducts.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const joinedCount = (data?.products.filter((p) => p.setup).length ?? 0) + ownProducts.length;

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
        description="Sell Printdecore’s products — at Printdecore’s price, a percentage higher or lower, or your own — and products you make yourself."
        actions={
          canEdit ? (
            <div className="flex gap-2">
              {joinedCount > 0 && <Button variant="secondary" icon={TrendingUp} onClick={() => setBulkOpen(true)}>Change all prices</Button>}
              <Button icon={Plus} onClick={() => setEditingOwn(null)}>New product</Button>
            </div>
          ) : undefined
        }
      />

      {data?.priceList && <OwnListPanel branchId={branchId} list={data.priceList} canEdit={canEdit} />}

      <div className="relative max-w-sm">
        <Search size={16} className={cn("absolute left-3 top-1/2 -translate-y-1/2", t.textTertiary)} />
        <input
          className={cn("w-full pl-9 pr-3 py-2 rounded-lg border text-sm", t.input)}
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div>
        <p className={cn("text-xs font-semibold uppercase tracking-wide mb-1.5", t.textSecondary)}>Your own products</p>
        {shownOwn.length === 0 ? (
          <Card padding="sm">
            <p className={cn("text-sm", t.textSecondary)}>
              {search ? "None match your search." : "Sell something that isn’t in Printdecore’s list — make it here, with its own choices and prices."}
            </p>
          </Card>
        ) : (
          <Card padding="none">
            <div className={cn("divide-y", t.isDark ? "divide-gray-700" : "divide-gray-100")}>
              {shownOwn.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", t.text)}>{r.name}</p>
                    <p className={cn("text-xs", t.textSecondary)}>
                      {[r.subCategory, r.pricingUnit && `Priced ${UNIT_LABEL[r.pricingUnit]}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {r.onSale ? <Badge color="green">On sale</Badge> : <Badge color="amber">{r.priced ? "Not on sale" : "Needs prices"}</Badge>}
                  <Button size="sm" variant="secondary" onClick={() => setEditingOwn(r)}>{canEdit ? "Edit" : "View"}</Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <p className={cn("text-xs font-semibold uppercase tracking-wide -mb-3", t.textSecondary)}>Printdecore’s products</p>
      {isLoading ? (
        <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{pricingError(error).message}</p>
      ) : groups.length === 0 ? (
        <EmptyState icon={Tag} title="No products yet" description="Printdecore is moving products to the new pricing — they’ll appear here as they’re ready." />
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
                        {r.pricingUnit ? `Priced ${UNIT_LABEL[r.pricingUnit]}` : ""}
                        {r.setup && r.setup.disabledOptionKeys.length > 0 && ` · ${r.setup.disabledOptionKeys.length} options off`}
                      </p>
                    </div>
                    <SetupBadge row={r} />
                    <Button size="sm" variant={r.setup ? "secondary" : "primary"} onClick={() => setEditing(r)}>
                      {r.setup ? (canEdit ? "Edit" : "View") : canEdit ? "Add" : "View"}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))
      )}

      {editing && <ShopProductEditor branchId={branchId} row={editing} canEdit={canEdit} onClose={() => setEditing(null)} />}
      {editingOwn !== undefined && (
        <OwnProductEditor branchId={branchId} row={editingOwn} canEdit={canEdit} onClose={() => setEditingOwn(undefined)} />
      )}
      <BulkChange branchId={branchId} open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}

function SetupBadge({ row }: { row: ShopProductRow }) {
  if (!row.setup) return <Badge>Not in your shop</Badge>;
  if (row.setup.strategy === "own") return <Badge color="purple">Your prices</Badge>;
  if (row.setup.strategy === "adjust") {
    const p = row.setup.adjustmentPct;
    return <Badge color={p < 0 ? "blue" : "amber"}>{p > 0 ? "+" : ""}{p}% vs Printdecore</Badge>;
  }
  return <Badge color="green">Printdecore’s price</Badge>;
}

function OwnListPanel({ branchId, list, canEdit }: { branchId: string; list: ShopPriceListSummary; canEdit: boolean }) {
  const t = useThemeClasses();
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["shopPricing", branchId] });

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      success(done);
      refresh();
    } catch (e) {
      const err = pricingError(e);
      showError(err.problems[0] ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="sm" className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <p className={cn("text-sm font-semibold", t.text)}>Your price list</p>
        <p className={cn("text-xs", t.textSecondary)}>
          {list.liveVersionId ? "Published prices are live." : "Nothing published yet — Printdecore’s products sell at Printdecore’s prices, and your own products go on sale once you publish."}
          {list.draftVersionId && ` Draft ${list.draftVersion} has changes customers don’t see yet.`}
        </p>
      </div>
      {canEdit && list.draftVersionId && (
        <>
          <input type="datetime-local" className={cn("px-2 py-1 rounded-md border text-sm", t.input)} value={when} onChange={(e) => setWhen(e.target.value)} title="Leave empty to start now" />
          <Button
            size="sm"
            loading={busy}
            onClick={() =>
              window.confirm(when ? `Publish your prices from ${new Date(when).toLocaleString()}?` : "Publish your prices now? Customers pay them straight away.") &&
              act(() => shopPricingApi.publish(branchId, list.draftVersionId!, when ? new Date(when).toISOString() : undefined), "Prices published")
            }
          >
            Publish
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => window.confirm("Throw away the draft and its changes?") && act(() => shopPricingApi.discard(branchId, list.draftVersionId!), "Draft discarded")}
          >
            Discard draft
          </Button>
        </>
      )}
    </Card>
  );
}

function BulkChange({ branchId, open, onClose }: { branchId: string; open: boolean; onClose: () => void }) {
  const t = useThemeClasses();
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const [pct, setPct] = useState("5");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const n = Number(pct);
    if (!n) return;
    setBusy(true);
    try {
      const r = await shopPricingApi.bulkAdjust(branchId, n);
      success(
        [r.adjusted && `${r.adjusted} product${r.adjusted === 1 ? "" : "s"} changed`, r.ownInDraft && `${r.ownInDraft} on your own prices changed in your draft — publish to apply`]
          .filter(Boolean)
          .join(" · "),
      );
      qc.invalidateQueries({ queryKey: ["shopPricing", branchId] });
      onClose();
    } catch (e) {
      showError(pricingError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change all prices">
      <p className={cn("text-sm mb-3", t.textSecondary)}>
        Raise or lower every product in your shop by a percentage. Products on Printdecore’s price change straight away; your own prices change in a draft you publish.
      </p>
      <div className="flex items-center gap-2 mb-4">
        <input type="number" step="0.5" className={cn("w-24 px-3 py-2 rounded-lg border text-sm", t.input)} value={pct} onChange={(e) => setPct(e.target.value)} />
        <span className={cn("text-sm", t.textSecondary)}>% — use a minus to lower (e.g. -5)</span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={apply} loading={busy} disabled={!Number(pct)}>
          {Number(pct) < 0 ? `Lower by ${Math.abs(Number(pct))}%` : `Raise by ${Number(pct) || 0}%`}
        </Button>
      </div>
    </Modal>
  );
}
