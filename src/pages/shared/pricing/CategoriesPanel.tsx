import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { Badge, Button } from "../../../components/ui";
import { Edit, ImageIcon, Plus, Trash2, X } from "../../../components/icons";
import { apiService } from "../../../services/api";
import { pricingError } from "../../../services/api/shopPricing";
import type { ServiceCategory } from "../../../types";

/**
 * The shop's own categories: what customers browse to find its products.
 * Each has a photo, a short description and the types inside it (e.g.
 * "Marketing prints" → Flyers, Posters). Printdecore's categories are shown
 * too, read-only — the shop can use them but not change them.
 */
export function CategoriesPanel({ branchId, canEdit, onClose }: { branchId: string; canEdit: boolean; onClose: () => void }) {
  const t = useThemeClasses();
  const [shown, setShown] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null | undefined>(undefined);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["serviceCategories", branchId],
    queryFn: () => apiService.getServiceCategories(branchId),
  });
  const own = categories.filter((c) => c.branchId === branchId);
  const platform = categories.filter((c) => !c.branchId);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const close = () => {
    setShown(false);
    setTimeout(onClose, 200);
  };

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/50 z-50 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")} onClick={close} />
      <aside
        role="dialog"
        aria-label="Categories"
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[560px] flex flex-col shadow-2xl transition-transform duration-200",
          t.isDark ? "bg-gray-900" : "bg-white",
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className={cn("px-6 py-4 border-b flex items-center gap-3", t.border)}>
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-base font-semibold", t.text)}>Categories</h3>
            <p className={cn("text-xs", t.textSecondary)}>How customers find your products. Add a photo so each one stands out.</p>
          </div>
          {canEdit && editing === undefined && <Button size="sm" icon={Plus} onClick={() => setEditing(null)}>New category</Button>}
          <button type="button" onClick={close} className={cn("p-2 rounded-lg", t.textSecondary)} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {editing !== undefined ? (
            <CategoryForm branchId={branchId} category={editing} onDone={() => setEditing(undefined)} />
          ) : isLoading ? (
            <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
          ) : (
            <>
              <section>
                <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", t.textSecondary)}>Your categories</p>
                {own.length === 0 ? (
                  <div className={cn("rounded-xl border border-dashed px-4 py-6 text-center", t.border)}>
                    <p className={cn("text-sm", t.text)}>You haven't made any yet</p>
                    <p className={cn("text-xs mt-1", t.textSecondary)}>Make one for anything that doesn't fit Printdecore's list — or let the pricing assistant make them for you.</p>
                    {canEdit && <Button size="sm" className="mt-3" icon={Plus} onClick={() => setEditing(null)}>New category</Button>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {own.map((c) => (
                      <CategoryTile key={c.id} category={c} onEdit={canEdit ? () => setEditing(c) : undefined} />
                    ))}
                  </div>
                )}
              </section>
              <section>
                <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", t.textSecondary)}>Printdecore's categories</p>
                <p className={cn("text-xs mb-2", t.textSecondary)}>You can list products in these too.</p>
                <div className="flex flex-wrap gap-1.5">
                  {platform.map((c) => (
                    <span key={c.id} className={cn("text-xs rounded-full px-2.5 py-1", t.surfaceInset, t.text)}>{c.name}</span>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function CategoryTile({ category: c, onEdit }: { category: ServiceCategory; onEdit?: () => void }) {
  const t = useThemeClasses();
  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={!onEdit}
      className={cn("text-left rounded-xl border overflow-hidden transition-shadow", t.border, onEdit && "hover:shadow-md")}
    >
      <div className={cn("aspect-[4/3] flex items-center justify-center", t.surfaceInset)}>
        {c.imageUrl ? <img src={c.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={28} className={t.textTertiary} />}
      </div>
      <div className="px-3 py-2">
        <p className={cn("text-sm font-medium truncate", t.text)}>{c.name}</p>
        <p className={cn("text-xs truncate", t.textSecondary)}>{c.imageUrl ? c.description || "Tap to edit" : "Add a photo"}</p>
      </div>
    </button>
  );
}

/** Make or change a category: photo, name, description and the types inside it */
function CategoryForm({ branchId, category, onDone }: { branchId: string; category: ServiceCategory | null; onDone: () => void }) {
  const t = useThemeClasses();
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(category?.imageUrl ?? null);
  const [newType, setNewType] = useState("");
  const [pendingTypes, setPendingTypes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: types = [] } = useQuery({
    queryKey: ["serviceSubCategories", category?.id, branchId],
    queryFn: () => apiService.getServiceSubCategories(category!.id, branchId),
    enabled: !!category,
  });

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const field = cn("mt-1 w-full px-3 py-2 rounded-lg border text-sm", t.input);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["serviceCategories", branchId] });
    qc.invalidateQueries({ queryKey: ["serviceSubCategories"] });
  };

  const addType = () => {
    const v = newType.trim();
    if (!v || pendingTypes.some((x) => x.toLowerCase() === v.toLowerCase()) || types.some((x) => x.name.toLowerCase() === v.toLowerCase())) return setNewType("");
    setPendingTypes([...pendingTypes, v]);
    setNewType("");
  };

  const submit = async () => {
    if (!name.trim()) return showError("Give the category a name", "Name needed", 4000);
    setBusy(true);
    try {
      const saved = category
        ? await apiService.updateServiceCategory(category.id, { name: name.trim(), description: description.trim(), image: image ?? undefined })
        : await apiService.createServiceCategory({ name: name.trim(), description: description.trim() || undefined, image: image ?? undefined, branchId });
      const toAdd = newType.trim() ? [...pendingTypes, newType.trim()] : pendingTypes;
      for (const type of toAdd) {
        await apiService.createServiceSubCategory({ categoryId: saved.id, name: type, pricingType: "MIXED", branchId });
      }
      refresh();
      success(category ? `${name.trim()} updated` : `${name.trim()} is ready — customers will see it once a product is on sale in it`, category ? "Category saved" : "Category added", 4500);
      onDone();
    } catch (e) {
      showError(pricingError(e).message, "Couldn't save the category", 5000);
    } finally {
      setBusy(false);
    }
  };

  const removeType = async (id: string, typeName: string) => {
    if (!window.confirm(`Remove “${typeName}”?`)) return;
    try {
      await apiService.deleteServiceSubCategory(id);
      refresh();
    } catch (e) {
      showError(pricingError(e).message.includes("violates") ? "Products are listed in it — move them first" : pricingError(e).message, "Couldn't remove it", 5000);
    }
  };

  const remove = async () => {
    if (!category || !window.confirm(`Delete the “${category.name}” category?`)) return;
    setBusy(true);
    try {
      await apiService.deleteServiceCategory(category.id);
      refresh();
      success(`${category.name} deleted`, "Category deleted", 3000);
      onDone();
    } catch (e) {
      showError(pricingError(e).message, "Couldn't delete it", 5000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h4 className={cn("text-sm font-semibold flex-1", t.text)}>{category ? `Edit ${category.name}` : "New category"}</h4>
        <button type="button" className={cn("text-xs", t.textSecondary)} onClick={onDone}>Cancel</button>
      </div>

      <label className={cn("block rounded-xl border-2 border-dashed overflow-hidden cursor-pointer", t.border)}>
        <div className={cn("aspect-[16/9] flex flex-col items-center justify-center relative", t.surfaceInset)}>
          {preview ? (
            <>
              <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white rounded-full px-2.5 py-1 flex items-center gap-1"><Edit size={12} /> Change photo</span>
            </>
          ) : (
            <>
              <ImageIcon size={32} className="text-amber-500" />
              <p className={cn("text-sm mt-2 font-medium", t.text)}>Add a photo</p>
              <p className={cn("text-xs", t.textSecondary)}>A clear picture of what you make. JPG or PNG.</p>
            </>
          )}
        </div>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
      </label>

      <label className="block text-xs">
        <span className={t.textSecondary}>Name</span>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Branded merchandise" maxLength={80} />
      </label>
      <label className="block text-xs">
        <span className={t.textSecondary}>Short description (optional)</span>
        <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Mugs, T-shirts and caps with your logo" maxLength={200} />
      </label>

      <div>
        <p className={cn("text-xs", t.textSecondary)}>Types inside it</p>
        <p className={cn("text-xs mb-2", t.textTertiary)}>Groups customers pick from, e.g. Mugs, T-shirts. Each product goes in one type.</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {types.map((s) => (
            <span key={s.id} className={cn("text-xs rounded-full pl-2.5 pr-1 py-1 flex items-center gap-1", t.surfaceInset, t.text)}>
              {s.name}
              {s.branchId === branchId ? (
                <button type="button" onClick={() => void removeType(s.id, s.name)} className={cn("p-0.5 rounded-full", t.textSecondary)} aria-label={`Remove ${s.name}`}><X size={12} /></button>
              ) : (
                <Badge color="gray" className="ml-1">Printdecore</Badge>
              )}
            </span>
          ))}
          {pendingTypes.map((s) => (
            <span key={s} className="text-xs rounded-full pl-2.5 pr-1 py-1 flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {s}
              <button type="button" onClick={() => setPendingTypes(pendingTypes.filter((x) => x !== s))} className="p-0.5 rounded-full" aria-label={`Remove ${s}`}><X size={12} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className={cn("flex-1 px-3 py-2 rounded-lg border text-sm", t.input)}
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addType();
              }
            }}
            placeholder="Add a type and press Enter"
            maxLength={80}
          />
          <Button variant="secondary" icon={Plus} onClick={addType} disabled={!newType.trim()}>Add</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        {category && (
          <button type="button" onClick={() => void remove()} disabled={busy} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 mr-auto">
            <Trash2 size={14} /> Delete category
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onDone} disabled={busy}>Cancel</Button>
          <Button onClick={() => void submit()} loading={busy}>{category ? "Save" : "Add category"}</Button>
        </div>
      </div>
    </div>
  );
}
