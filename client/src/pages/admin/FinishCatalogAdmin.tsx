/**
 * FinishCatalogAdmin — CMS for the public finish showroom catalog.
 * Uses finishCatalogRouter: listAdmin, create, update, togglePublished, delete.
 *
 * Distinct from FinishSelectionsAdmin, which manages what a specific client
 * picked for their specific project — this manages the reusable catalog of
 * products shown to prospects on the public /showroom page.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useMutationWithToast } from "@/_core/hooks/useMutationWithToast";
import { useToast } from "@/components/ToastProvider";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  EyeOff,
  Globe,
  Image,
  Loader2,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const BLANK_FORM = {
  name: "",
  slug: "",
  category: "",
  brand: "",
  description: "",
  priceTier: "" as "" | "$" | "$$" | "$$$",
  imageUrl: "",
  featured: false,
  published: false,
  sortOrder: 0,
};

const CATEGORIES = [
  "Flooring",
  "Countertops",
  "Cabinets",
  "Paint",
  "Roofing",
  "Fixtures",
  "Tile",
  "Lighting",
];

const PRICE_TIERS = ["$", "$$", "$$$"] as const;

export default function FinishCatalogAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});
  const [imagePreviewBroken, setImagePreviewBroken] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setImagePreviewBroken(false);
  }, [form.imageUrl]);

  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.finishCatalog.listAdmin.useQuery();

  // Live updates: catalog edits from another device refresh the list.
  useRealtimeTable({
    table: "finish_catalog_items",
    onUpdate: () => utils.finishCatalog.listAdmin.invalidate(),
  });

  const create = useMutationWithToast(trpc.finishCatalog.create.useMutation(), {
    success: "Item Created",
    successMessage: "Catalog item created.",
    error: "Create Failed",
    invalidate: () => utils.finishCatalog.listAdmin.invalidate(),
    onSuccess: () => {
      setShowForm(false);
      setForm(BLANK_FORM);
    },
  });

  const update = useMutationWithToast(trpc.finishCatalog.update.useMutation(), {
    success: "Item Updated",
    successMessage: "Catalog item updated.",
    error: "Update Failed",
    errorMessage: "Could not update the catalog item. Please try again.",
    invalidate: () => utils.finishCatalog.listAdmin.invalidate(),
    onSuccess: () => {
      setShowForm(false);
      setEditId(null);
    },
  });

  const togglePublished = useMutationWithToast(
    trpc.finishCatalog.togglePublished.useMutation(),
    {
      success: "Status Updated",
      error: "Update Failed",
      errorMessage: "Could not change the publish status. Please try again.",
      invalidate: () => utils.finishCatalog.listAdmin.invalidate(),
    }
  );

  const deleteItem = useMutationWithToast(
    trpc.finishCatalog.delete.useMutation(),
    {
      success: "Item Deleted",
      successMessage: "Catalog item deleted.",
      error: "Delete Failed",
      errorMessage: "Could not delete the item. Please try again.",
      invalidate: () => utils.finishCatalog.listAdmin.invalidate(),
    }
  );

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      name: item.name ?? "",
      slug: item.slug ?? "",
      category: item.category ?? "",
      brand: item.brand ?? "",
      description: item.description ?? "",
      priceTier: (item.price_tier ?? "") as "" | "$" | "$$" | "$$$",
      imageUrl: item.image_url ?? "",
      featured: item.featured ?? false,
      published: item.published ?? false,
      sortOrder: item.sort_order ?? 0,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (form.imageUrl) {
      try {
        new URL(form.imageUrl);
      } catch {
        addToast({
          type: "error",
          title: "Invalid Image URL",
          message: "Use a full URL (https://…).",
          duration: 8000,
        });
        return;
      }
    }

    const payload = {
      name: form.name,
      slug:
        form.slug ||
        form.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      category: form.category || undefined,
      brand: form.brand || undefined,
      description: form.description || undefined,
      priceTier: form.priceTier || undefined,
      imageUrl: form.imageUrl || undefined,
      featured: form.featured,
      published: form.published,
      sortOrder: form.sortOrder,
    };
    if (editId && update) {
      update.mutate({ id: editId, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const f =
    (key: keyof typeof BLANK_FORM) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setForm(prev => ({
        ...prev,
        [key]:
          e.target.type === "number" ? Number(e.target.value) : e.target.value,
      }));
    };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-y-3 mb-6">
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Finish Catalog
            </h1>
            <p className="text-sm text-muted-foreground font-light mt-0.5">
              Manage the public finish showroom — publish, feature, and add
              products
            </p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setForm(BLANK_FORM);
              setShowForm(v => !v);
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            <Plus className="h-3.5 w-3.5" /> New Item
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            {
              label: "Total",
              value: items?.length ?? 0,
              color: "text-foreground",
            },
            {
              label: "Published",
              value: items?.filter(i => i.published).length ?? 0,
              color: "text-green-400",
            },
            {
              label: "Featured",
              value: items?.filter(i => i.featured).length ?? 0,
              color: "text-primary",
            },
          ].map(s => (
            <div
              key={s.label}
              className="bg-card border border-border/60 p-4 text-center"
            >
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p
                className="text-[9px] text-muted-foreground tracking-widest uppercase mt-0.5"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div className="bg-card border border-primary/30 p-5 mb-6">
            <div className="flex items-center justify-between mb-5">
              <p
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {editId ? "Edit Item" : "New Catalog Item"}
              </p>
              <button
                onClick={() => setShowForm(false)}
                aria-label="Close item form"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                value={form.name}
                onChange={f("name")}
                placeholder="Item name *"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 lg:col-span-2"
              />

              <select
                value={form.category}
                onChange={f("category")}
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                <option value="">Category…</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                value={form.brand}
                onChange={f("brand")}
                placeholder="Brand"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />

              <select
                value={form.priceTier}
                onChange={f("priceTier")}
                className="px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                <option value="">Price tier…</option>
                {PRICE_TIERS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <input
                value={form.imageUrl}
                onChange={f("imageUrl")}
                placeholder="Image URL"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 lg:col-span-3"
              />

              <textarea
                value={form.description}
                onChange={f("description")}
                placeholder="Description"
                rows={3}
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none sm:col-span-2 lg:col-span-3"
              />
            </div>

            {/* Toggles */}
            <div className="flex gap-4 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e =>
                    setForm(prev => ({ ...prev, published: e.target.checked }))
                  }
                  className="accent-primary"
                />
                <span className="text-xs text-foreground">
                  Publish to showroom
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={e =>
                    setForm(prev => ({ ...prev, featured: e.target.checked }))
                  }
                  className="accent-primary"
                />
                <span className="text-xs text-foreground">Featured item</span>
              </label>
            </div>

            {/* Image preview */}
            {form.imageUrl && !imagePreviewBroken && (
              <div className="mt-3 h-32 overflow-hidden border border-border/40">
                <img
                  src={form.imageUrl}
                  alt="Item preview"
                  className="w-full h-full object-cover"
                  onError={() => setImagePreviewBroken(true)}
                />
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={!form.name || create.isPending || update?.isPending}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {(create.isPending || update?.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {editId ? "Save Changes" : "Create Item"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="border border-border/60 text-muted-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:text-foreground transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Item list */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading catalog…
            </span>
          </div>
        )}

        {!isLoading && (!items || items.length === 0) && (
          <div className="py-20 text-center">
            <Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-light mb-1">
              No catalog items yet
            </p>
            <p className="text-xs text-muted-foreground/60">
              Add your first product to start building the public showroom.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {items?.map(item => (
            <div
              key={item.id}
              className={`bg-card border p-4 flex gap-4 ${
                item.published
                  ? "border-border/60"
                  : "border-border/30 opacity-80"
              }`}
            >
              {/* Thumbnail */}
              <div className="w-20 h-16 shrink-0 border border-border/40 overflow-hidden bg-muted/20">
                {item.image_url && !brokenImages[item.id] ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={() =>
                      setBrokenImages(prev => ({ ...prev, [item.id]: true }))
                    }
                  />
                ) : item.image_url ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground/30 text-[10px]">
                      No img
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {item.name}
                  </p>
                  {item.featured && (
                    <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  {item.category && <span>{item.category}</span>}
                  {item.brand && <span>· {item.brand}</span>}
                  {item.price_tier && <span>· {item.price_tier}</span>}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Publish toggle */}
                <button
                  onClick={() =>
                    togglePublished.mutate({
                      id: item.id,
                      published: !item.published,
                    })
                  }
                  disabled={togglePublished.isPending}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase border transition-colors ${
                    item.published
                      ? "text-green-400 border-green-400/30 bg-green-400/10 hover:bg-green-400/20"
                      : "text-muted-foreground border-border/60 hover:border-primary/40 hover:text-primary"
                  }`}
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {item.published ? (
                    <Globe className="h-2.5 w-2.5" />
                  ) : (
                    <EyeOff className="h-2.5 w-2.5" />
                  )}
                  {item.published ? "Live" : "Draft"}
                </button>

                {/* Edit */}
                <button
                  onClick={() => handleEdit(item)}
                  className="h-8 w-8 border border-border/60 flex items-center justify-center hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
                  title="Edit"
                  aria-label={`Edit ${item.name}`}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>

                {/* Delete */}
                {deleteItem && (
                  <button
                    onClick={() =>
                      setDeleteTarget({ id: item.id, name: item.name })
                    }
                    className="h-8 w-8 border border-border/60 flex items-center justify-center hover:border-red-400/40 hover:text-red-400 text-muted-foreground transition-colors"
                    title="Delete"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete catalog item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                "{deleteTarget?.name}"
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-500/90 text-white"
              onClick={() => {
                if (deleteTarget) {
                  deleteItem.mutate({ id: deleteTarget.id });
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
