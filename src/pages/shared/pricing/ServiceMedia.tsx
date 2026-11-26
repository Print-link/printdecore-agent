import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui";
import { ImageIcon, Trash2, Upload } from "../../../components/icons";
import { inputTypeOf, pricingError, shopPricingApi, type CatalogMedia, type ProductDefinition } from "../../../services/api/shopPricing";
import { Block } from "./parts";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;
const GALLERY_MAX = 10;

/** Quick checks before uploading; the server checks the file itself */
const pickProblem = (file: File) =>
  !ACCEPT.split(",").includes(file.type) ? "Use a JPEG, PNG or WebP image" : file.size > MAX_BYTES ? "Images must be 5 MB or smaller" : null;

/**
 * Pictures for one of the shop's own services: a gallery customers see at
 * the top, a picture per option (e.g. each finish), and an instruction
 * picture per field (e.g. how to measure). Shown as soon as they're added.
 */
export function ServiceMedia({ branchId, product, canEdit }: { branchId: string; product: ProductDefinition; canEdit: boolean }) {
  const t = useThemeClasses();
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const key = ["shopPricing", branchId, "media", product.id];
  const { data: media = [], isLoading } = useQuery({ queryKey: key, queryFn: () => shopPricingApi.media(branchId, product.id) });
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<{ kind: CatalogMedia["kind"]; targetKey?: string } | null>(null);

  const gallery = media.filter((m) => m.kind === "gallery");
  const byTarget = (kind: CatalogMedia["kind"], targetKey: string) => media.find((m) => m.kind === kind && m.targetKey === targetKey);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["shopPricing", branchId, "ownProduct", product.id] });
  };

  const choose = (kind: CatalogMedia["kind"], targetKey?: string) => {
    target.current = { kind, targetKey };
    input.current?.click();
  };

  const upload = async (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file || !target.current) return;
    const problem = pickProblem(file);
    if (problem) return showError(problem);
    const { kind, targetKey } = target.current;
    setBusy(`${kind}:${targetKey ?? ""}`);
    try {
      await shopPricingApi.addMedia(branchId, product.id, file, { kind, targetKey });
      success("Picture added");
      refresh();
    } catch (e) {
      showError(pricingError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (m: CatalogMedia) => {
    try {
      await shopPricingApi.removeMedia(branchId, product.id, m.id);
      refresh();
    } catch (e) {
      showError(pricingError(e).message);
    }
  };

  const saveAlt = async (m: CatalogMedia, alt: string) => {
    if ((m.alt ?? "") === alt.trim()) return;
    try {
      await shopPricingApi.updateMedia(branchId, product.id, m.id, { alt: alt.trim() });
      refresh();
    } catch (e) {
      showError(pricingError(e).message);
    }
  };

  const slot = (kind: "option" | "instruction", targetKey: string, label: string) => {
    const m = byTarget(kind, targetKey);
    const loading = busy === `${kind}:${targetKey}`;
    return (
      <div key={targetKey} className="flex items-center gap-3">
        <div className={cn("w-12 h-12 rounded-md border overflow-hidden flex items-center justify-center shrink-0", t.border)}>
          {m ? <img src={m.url} alt={m.alt ?? label} className="w-full h-full object-cover" /> : <ImageIcon size={18} className={t.textTertiary} />}
        </div>
        <span className={cn("flex-1 text-sm truncate", t.text)}>{label}</span>
        {canEdit && (
          <>
            <Button size="sm" variant="ghost" loading={loading} onClick={() => choose(kind, targetKey)}>{m ? "Replace" : "Add"}</Button>
            {m && (
              <button type="button" aria-label={`Remove picture for ${label}`} className={t.textTertiary} onClick={() => remove(m)}>
                <Trash2 size={14} />
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const optionFields = product.attributes.filter((a) => a.options.length && (inputTypeOf(a) === "select" || inputTypeOf(a) === "multi_select"));
  const inputFields = product.attributes.filter((a) => !(inputTypeOf(a) === "select" || inputTypeOf(a) === "multi_select"));

  return (
    <Block title="Pictures" subtitle="JPEG, PNG or WebP, up to 5 MB.">
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      {isLoading ? (
        <p className={cn("text-sm", t.textSecondary)}>Loading…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <p className={cn("text-xs font-medium mb-2", t.textSecondary)}>Gallery ({gallery.length}/{GALLERY_MAX})</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {gallery.map((m) => (
                <figure key={m.id} className={cn("rounded-lg border overflow-hidden", t.border)}>
                  <div className="relative aspect-square">
                    <img src={m.url} alt={m.alt ?? ""} className="w-full h-full object-cover" />
                    {canEdit && (
                      <button type="button" aria-label="Remove picture" onClick={() => remove(m)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  {canEdit ? (
                    <input className={cn("w-full px-2 py-1 text-[11px] border-t bg-transparent", t.border, t.text)} placeholder="Describe it" maxLength={200}
                      defaultValue={m.alt ?? ""} onBlur={(e) => saveAlt(m, e.target.value)} />
                  ) : m.alt ? (
                    <figcaption className={cn("px-2 py-1 text-[11px]", t.textSecondary)}>{m.alt}</figcaption>
                  ) : null}
                </figure>
              ))}
              {canEdit && gallery.length < GALLERY_MAX && (
                <button type="button" onClick={() => choose("gallery")} disabled={busy === "gallery:"}
                  className={cn("aspect-square rounded-lg border border-dashed flex flex-col items-center justify-center gap-1 text-xs", t.border, t.textSecondary)}>
                  <Upload size={18} />
                  {busy === "gallery:" ? "Uploading…" : "Add picture"}
                </button>
              )}
            </div>
          </div>

          {optionFields.length > 0 && (
            <div className="space-y-3">
              <p className={cn("text-xs font-medium", t.textSecondary)}>Option pictures</p>
              {optionFields.map((a) => (
                <div key={a.key} className="space-y-2">
                  <p className={cn("text-xs", t.textTertiary)}>{a.name}</p>
                  {a.options.map((o) => slot("option", `${a.key}:${o.key}`, o.name))}
                </div>
              ))}
            </div>
          )}

          {inputFields.length > 0 && (
            <div className="space-y-2">
              <p className={cn("text-xs font-medium", t.textSecondary)}>How-to pictures for fields</p>
              {inputFields.map((a) => slot("instruction", a.key, a.name))}
            </div>
          )}
        </div>
      )}
    </Block>
  );
}
