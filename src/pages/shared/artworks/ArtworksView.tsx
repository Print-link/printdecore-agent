import { useState, useCallback, useEffect, useRef } from "react";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import {
  Card,
  Button,
  Input,
  Modal,
  EmptyState,
} from "../../../components/ui";
import {
  Plus,
  Edit,
  Trash2,
  Palette,
  X,
  Eye,
  EyeOff,
} from "../../../components/icons";
import { artworkApi, type Artwork, type ArtworkEligibility } from "../../../services/api/artworks";
import { AlertTriangle } from "../../../components/icons";

interface ArtworksViewProps {
  branchId: string;
  canManage: boolean;
}

export function ArtworksView({ branchId, canManage }: ArtworksViewProps) {
  const t = useThemeClasses();
  const { success, error: showError } = useToast();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [eligibility, setEligibility] = useState<ArtworkEligibility | null>(null);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadArtworks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await artworkApi.getByBranch(branchId);
      setArtworks(data);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to load artworks",
        "Error",
        5000
      );
    } finally {
      setIsLoading(false);
    }
  }, [branchId, showError]);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  // Check eligibility for managers/clerks
  useEffect(() => {
    if (!canManage) return;
    artworkApi.checkEligibility(branchId).then(setEligibility).catch(() => {});
  }, [branchId, canManage]);

  const handleDelete = async (id: string) => {
    try {
      await artworkApi.delete(id);
      success("Artwork deleted", "Deleted", 3000);
      loadArtworks();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete artwork",
        "Error",
        5000
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (artwork: Artwork) => {
    try {
      await artworkApi.update(artwork.id, { isActive: !artwork.isActive });
      success(
        artwork.isActive ? "Artwork hidden" : "Artwork visible",
        "Updated",
        3000
      );
      loadArtworks();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to update artwork",
        "Error",
        5000
      );
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingArtwork(null);
    loadArtworks();
  };

  if (isLoading && artworks.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const canCreate = eligibility?.eligible ?? false;

  return (
    <div className="space-y-4">
      {/* Eligibility banner */}
      {canManage && eligibility && !eligibility.eligible && (
        <div
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border",
            t.isDark
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-amber-50 border-amber-200"
          )}
        >
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className={cn("text-sm font-semibold", t.text)}>
              {eligibility.current} / {eligibility.required} completed transactions
            </p>
            <p className={cn("text-xs mt-0.5", t.textSecondary)}>
              Your branch needs at least {eligibility.required} completed transactions (orders & paid quotes) before you can post artworks.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      {canManage && canCreate && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingArtwork(null);
              setShowForm(true);
            }}
            icon={Plus}
          >
            New Artwork
          </Button>
        </div>
      )}

      {/* Grid */}
      {artworks.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No artworks yet"
          description={
            canManage && !canCreate
              ? `Complete ${eligibility ? eligibility.required - eligibility.current : 20} more transactions to unlock artwork posting.`
              : "Showcase your branch's work by posting artworks for customers to see."
          }
          action={
            canManage && canCreate ? (
              <Button
                onClick={() => {
                  setEditingArtwork(null);
                  setShowForm(true);
                }}
                icon={Plus}
              >
                Create First Artwork
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artworks.map((artwork) => (
            <Card key={artwork.id} padding="none">
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-800">
                {artwork.images[0] ? (
                  <img
                    src={artwork.images[0]}
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Palette size={32} className={t.textTertiary} />
                  </div>
                )}
                {artwork.images.length > 1 && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-md">
                    <span className="text-[10px] font-bold text-white">
                      {artwork.images.length} photos
                    </span>
                  </div>
                )}
                {!artwork.isActive && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500/80 backdrop-blur-sm rounded-md">
                    <span className="text-[10px] font-bold text-white">
                      Hidden
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3 space-y-2">
                <h3 className={cn("text-sm font-bold line-clamp-1", t.text)}>
                  {artwork.title}
                </h3>
                {artwork.description && (
                  <p
                    className={cn(
                      "text-xs line-clamp-2",
                      t.textSecondary
                    )}
                  >
                    {artwork.description}
                  </p>
                )}

                {/* Tags */}
                {artwork.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {artwork.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-medium rounded",
                          t.isDark
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                    {artwork.tags.length > 3 && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-medium rounded",
                          t.isDark
                            ? "bg-gray-700 text-gray-400"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        +{artwork.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Edit}
                      onClick={() => {
                        setEditingArtwork(artwork);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={artwork.isActive ? EyeOff : Eye}
                      onClick={() => handleToggleActive(artwork)}
                    >
                      {artwork.isActive ? "Hide" : "Show"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setDeletingId(artwork.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <ArtworkFormModal
          branchId={branchId}
          artwork={editingArtwork}
          onClose={() => {
            setShowForm(false);
            setEditingArtwork(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <Modal
          open={true}
          onClose={() => setDeletingId(null)}
          title="Delete Artwork"
          maxWidth="sm"
        >
          <p className={cn("text-sm mb-4", t.textSecondary)}>
            Are you sure you want to delete this artwork? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleDelete(deletingId)}>
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Form Modal ─────────────────────────────────────────────────────

function ArtworkFormModal({
  branchId,
  artwork,
  onClose,
  onSuccess,
}: {
  branchId: string;
  artwork: Artwork | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(artwork?.title || "");
  const [description, setDescription] = useState(artwork?.description || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(artwork?.tags || []);
  const [existingImages, setExistingImages] = useState<string[]>(
    artwork?.images || []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!artwork;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.size <= 10 * 1024 * 1024);
    if (valid.length < files.length) {
      showError("Some files were too large (max 10MB each)", "Warning", 3000);
    }
    setNewFiles((prev) => [...prev, ...valid]);

    // Generate previews
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showError("Title is required", "Validation", 3000);
      return;
    }
    if (existingImages.length === 0 && newFiles.length === 0) {
      showError("At least one image is required", "Validation", 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await artworkApi.update(artwork.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          tags,
          existingImages,
          images: newFiles.length > 0 ? newFiles : undefined,
        });
        success("Artwork updated", "Success", 3000);
      } else {
        await artworkApi.create({
          branchId,
          title: title.trim(),
          description: description.trim() || undefined,
          tags,
          images: newFiles,
        });
        success("Artwork created", "Success", 3000);
      }
      onSuccess();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to save artwork",
        "Error",
        5000
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEditing ? "Edit Artwork" : "New Artwork"}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Title */}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Large Format Banner Print"
        />

        {/* Description */}
        <div>
          <label
            className={cn("block text-sm font-medium mb-1", t.textSecondary)}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this artwork..."
            rows={3}
            className={cn(
              "w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none",
              t.input
            )}
          />
        </div>

        {/* Tags */}
        <div>
          <label
            className={cn("block text-sm font-medium mb-1", t.textSecondary)}
          >
            Tags
          </label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button variant="secondary" onClick={addTag} size="sm">
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md",
                    t.isDark
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Images */}
        <div>
          <label
            className={cn("block text-sm font-medium mb-1", t.textSecondary)}
          >
            Images
          </label>

          {/* Existing images (for editing) */}
          {existingImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {existingImages.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeExistingImage(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New file previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden">
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeNewFile(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full py-6 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 transition-colors",
              t.isDark
                ? "border-gray-700 hover:border-amber-500/50 text-gray-400"
                : "border-gray-200 hover:border-amber-400 text-gray-500"
            )}
          >
            <Palette size={24} />
            <span className="text-xs font-medium">
              Click to upload images (max 5, 10MB each)
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isEditing ? "Save Changes" : "Create Artwork"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
