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

export function CategoryTile({ category: c, onEdit }: { category: ServiceCategory; onEdit?: () => void }) {
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

/** Make or change a category: photo, name, description and the types inside it. `onDone` gets the saved category (none when cancelled or deleted). */
export function CategoryForm({
  branchId,
  category,
  onDone,
  bare = false,
}: {
  branchId: string;
  category: ServiceCategory | null;
  onDone: (saved?: ServiceCategory) => void;
  /** Inside a dialog that already shows the title and a back button */
  bare?: boolean;
}) {
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
      success(category ? `${name.trim()} updated` : `${name.trim()} is ready`, category ? "Category saved" : "Category added", 4000);
      onDone(saved);
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
      {!bare && <div className="flex items-center gap-2">
        <h4 className={cn("text-sm font-semibold flex-1", t.text)}>{category ? `Edit ${category.name}` : "New category"}</h4>
        <button type="button" className={cn("text-xs", t.textSecondary)} onClick={() => onDone()}>Cancel</button>
      </div>}

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
          <Button variant="secondary" onClick={() => onDone()} disabled={busy}>Cancel</Button>
          <Button onClick={() => void submit()} loading={busy}>{category ? "Save" : "Add category"}</Button>
        </div>
      </div>
    </div>
  );
}
