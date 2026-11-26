import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui";
import { ArrowLeft, Edit, ImageIcon, Plus, X } from "../../../components/icons";
import { apiService } from "../../../services/api";
import { pricingError } from "../../../services/api/shopPricing";
import type { ServiceCategory } from "../../../types";
import { CategoryForm } from "./CategoryForm";

export interface PickedListing {
  categoryId: string;
  subCategoryId: string;
}

/**
 * The first step of a new service: which category it belongs to. A missing
 * category can be made right here; the shop then carries on with it. If the
 * category has several types inside it, the shop picks one too.
 */
export function NewServicePicker({
  branchId,
  onPicked,
  onClose,
}: {
  branchId: string;
  onPicked: (listing: PickedListing) => void;
  onClose: () => void;
}) {
  const t = useThemeClasses();
  const qc = useQueryClient();
  const { error: showError } = useToast();
  const [shown, setShown] = useState(false);
  /** undefined = choosing; null = making a new one; a category = editing it */
  const [form, setForm] = useState<ServiceCategory | null | undefined>(undefined);
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [newType, setNewType] = useState("");
  /** The shop's own type, when the one it wants isn't listed */
  const [addingType, setAddingType] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["serviceCategories", branchId],
    queryFn: () => apiService.getServiceCategories(branchId),
  });
  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ["serviceSubCategories", category?.id, branchId],
    queryFn: () => apiService.getServiceSubCategories(category!.id, branchId),
    enabled: !!category,
  });
  const own = categories.filter((c) => c.branchId === branchId);
  const platform = categories.filter((c) => !c.branchId);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = scroll;
    };
  }, []);
  const close = () => {
    setShown(false);
    setTimeout(onClose, 200);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** A category with no types yet gets one of the same name, so the service has somewhere to go */
  const addType = async (name: string) => {
    if (!category || !name.trim()) return;
    // Already there under the same name: use it
    const same = types.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (same) return onPicked({ categoryId: category.id, subCategoryId: same.id });
    setBusy(true);
    try {
      const made = await apiService.createServiceSubCategory({ categoryId: category.id, name: name.trim(), pricingType: "MIXED", branchId });
      qc.invalidateQueries({ queryKey: ["serviceSubCategories"] });
      onPicked({ categoryId: category.id, subCategoryId: made.id });
    } catch (e) {
      showError(pricingError(e).message, "Couldn't add it", 5000);
    } finally {
      setBusy(false);
    }
  };

  const title = form !== undefined ? (form ? `Edit ${form.name}` : "New category") : category ? category.name : "What kind of service?";
  const subtitle =
    form !== undefined
      ? "Customers browse categories to find your services."
      : category
        ? "Which of these is it? Or add your own."
        : "Choose the category it belongs to. Not there? Make a new one.";

  const tile = (c: ServiceCategory, editable: boolean) => (
    <div key={c.id} className="relative">
      <button
        type="button"
        onClick={() => setCategory(c)}
        className={cn("w-full text-left rounded-xl border overflow-hidden hover:border-amber-400 transition-colors", t.border)}
      >
        <div className={cn("aspect-[4/3] flex items-center justify-center", t.surfaceInset)}>
          {c.imageUrl ? <img src={c.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={26} className={t.textTertiary} />}
        </div>
        <p className={cn("px-3 py-2 text-sm font-medium truncate", t.text)}>{c.name}</p>
      </button>
      {editable && (
        <button
          type="button"
          onClick={() => setForm(c)}
          aria-label={`Edit ${c.name}`}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white"
        >
          <Edit size={14} />
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/50 z-50 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")} onClick={close} />
      <div
        role="dialog"
        aria-label={title}
        className={cn(
          "fixed z-50 inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] sm:max-h-[85dvh] sm:rounded-2xl flex flex-col transition-all duration-200",
          t.isDark ? "bg-gray-900" : "bg-white",
          shown ? "translate-y-0 opacity-100 sm:-translate-y-1/2" : "translate-y-full opacity-0 sm:-translate-y-[45%]",
        )}
      >
        <div className={cn("px-5 py-4 border-b flex items-center gap-3", t.border)}>
          {(category || form !== undefined) && (
            <button
              type="button"
              aria-label="Back"
              className={cn("p-1.5 -ml-1.5 rounded-lg", t.textSecondary)}
              onClick={() => {
                if (form !== undefined) return setForm(undefined);
                setCategory(null);
                setAddingType(false);
                setNewType("");
              }}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-base font-semibold truncate", t.text)}>{title}</h3>
            <p className={cn("text-xs", t.textSecondary)}>{subtitle}</p>
          </div>
          <button type="button" onClick={close} className={cn("p-1.5 rounded-lg", t.textSecondary)} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {form !== undefined ? (
            <CategoryForm
              bare
              branchId={branchId}
              category={form}
              onDone={(saved) => {
                const wasNew = form === null;
                setForm(undefined);
                // A new category: carry on with it straight away
                if (saved && wasNew) setCategory(saved);
              }}
            />
          ) : category ? (
            typesLoading ? (
              <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
            ) : types.length === 0 ? (
              <div className="space-y-3">
                <p className={cn("text-sm", t.text)}>Nothing inside {category.name} yet. Name the first type — e.g. Mugs, T-shirts.</p>
                <div className="flex gap-2">
                  <input
                    className={cn("flex-1 px-3 py-2 rounded-lg border text-sm", t.input)}
                    value={newType}
                    autoFocus
                    maxLength={80}
                    placeholder={category.name}
                    onChange={(e) => setNewType(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void addType(newType || category.name)}
                  />
                  <Button loading={busy} onClick={() => void addType(newType || category.name)}>Continue</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {types.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPicked({ categoryId: category.id, subCategoryId: s.id })}
                    className={cn("w-full text-left rounded-xl border px-4 py-3 text-sm font-medium hover:border-amber-400 transition-colors", t.border, t.text)}
                  >
                    {s.name}
                  </button>
                ))}
                {addingType ? (
                  <div className={cn("rounded-xl border-2 border-dashed p-3 space-y-2", t.border)}>
                    <p className={cn("text-xs", t.textSecondary)}>Name it — e.g. Mesh banner</p>
                    <div className="flex gap-2">
                      <input
                        className={cn("flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm", t.input)}
                        value={newType}
                        autoFocus
                        maxLength={80}
                        onChange={(e) => setNewType(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void addType(newType)}
                      />
                      <Button loading={busy} disabled={!newType.trim()} onClick={() => void addType(newType)}>Continue</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingType(true)}
                    className={cn("w-full text-left rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium inline-flex items-center gap-2 hover:border-amber-400 transition-colors", t.border, t.text)}
                  >
                    <Plus size={16} /> Not listed? Add your own
                  </button>
                )}
              </div>
            )
          ) : isLoading ? (
            <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
          ) : (
            <div className="space-y-6">
              <section>
                <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", t.textSecondary)}>Your categories</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(null)}
                    className={cn("rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 min-h-[140px] text-sm font-medium hover:border-amber-400 transition-colors", t.border, t.text)}
                  >
                    <span className="w-9 h-9 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center"><Plus size={18} /></span>
                    New category
                  </button>
                  {own.map((c) => tile(c, true))}
                </div>
              </section>
              {platform.length > 0 && (
                <section>
                  <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", t.textSecondary)}>Printdecore's categories</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{platform.map((c) => tile(c, false))}</div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
