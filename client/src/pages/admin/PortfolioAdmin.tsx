/**
 * PortfolioAdmin — Full CMS for managing public portfolio.
 * Uses portfolioRouter: listAdmin, create, update, togglePublished, delete.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { SkeletonCard } from "@/components/Skeletons";
import { QueryError } from "@/components/QueryError";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  title: "",
  slug: "",
  category: "",
  shortDescription: "",
  description: "",
  location: "",
  completionYear: new Date().getFullYear(),
  squareFootage: "",
  coverImageUrl: "",
  galleryImageUrls: "", // comma-separated URLs
  clientTestimonial: "",
  clientName: "",
  featured: false,
  published: false,
  sortOrder: 0,
};

const CATEGORIES = [
  "Custom Home",
  "Remodel",
  "Addition",
  "New Construction",
  "Restoration",
  "Outdoor Living",
  "Roofing",
  "Cabinets & Millwork",
  "Painting",
];

export default function PortfolioAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [brokenCovers, setBrokenCovers] = useState<Record<number, boolean>>({});
  const [coverPreviewBroken, setCoverPreviewBroken] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setCoverPreviewBroken(false);
  }, [form.coverImageUrl]);
  const utils = trpc.useUtils();
  const {
    data: projects,
    isLoading,
    isError,
    refetch,
  } = trpc.portfolio.listAdmin.useQuery();

  // Live updates: portfolio edits from another device refresh the list.
  useRealtimeTable({
    table: "portfolio_projects",
    onUpdate: () => utils.portfolio.listAdmin.invalidate(),
  });

  const create = useMutationWithToast(trpc.portfolio.create.useMutation(), {
    success: "Project Created",
    successMessage: "Portfolio project created.",
    error: "Create Failed",
    invalidate: () => utils.portfolio.listAdmin.invalidate(),
    onSuccess: () => {
      setShowForm(false);
      setForm(BLANK_FORM);
    },
  });

  const update = useMutationWithToast(trpc.portfolio.update.useMutation(), {
    success: "Project Updated",
    successMessage: "Project updated.",
    error: "Update Failed",
    errorMessage: "Could not update the portfolio project. Please try again.",
    invalidate: () => utils.portfolio.listAdmin.invalidate(),
    onSuccess: () => {
      setShowForm(false);
      setEditId(null);
    },
  });

  const togglePublished = useMutationWithToast(
    trpc.portfolio.togglePublished.useMutation(),
    {
      success: "Status Updated",
      error: "Update Failed",
      errorMessage: "Could not change the publish status. Please try again.",
      invalidate: () => utils.portfolio.listAdmin.invalidate(),
    }
  );

  const deleteProject = useMutationWithToast(
    trpc.portfolio.delete.useMutation(),
    {
      success: "Project Deleted",
      successMessage: "Project deleted.",
      error: "Delete Failed",
      errorMessage: "Could not delete the project. Please try again.",
      invalidate: () => utils.portfolio.listAdmin.invalidate(),
    }
  );

  const handleEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      title: p.title ?? "",
      slug: p.slug ?? "",
      category: p.category ?? "",
      shortDescription: p.short_description ?? "",
      description: p.description ?? "",
      location: p.location ?? "",
      completionYear: p.completion_year ?? new Date().getFullYear(),
      squareFootage: p.square_footage ? String(p.square_footage) : "",
      coverImageUrl: p.cover_image_url ?? "",
      galleryImageUrls: (() => {
        try {
          return (JSON.parse(p.gallery_image_urls ?? "[]") as string[]).join(
            ", "
          );
        } catch {
          return "";
        }
      })(),
      clientTestimonial: p.client_testimonial ?? "",
      clientName: p.client_name ?? "",
      featured: p.featured ?? false,
      published: p.published ?? false,
      sortOrder: p.sort_order ?? 0,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    // Validate gallery URLs client-side so the server's z.string().url()
    // rejection doesn't silently drop the entire mutation with a generic
    // "Create Failed" toast.
    const galleryUrls = form.galleryImageUrls
      ? form.galleryImageUrls
          .split(",")
          .map((u: string) => u.trim())
          .filter(Boolean)
      : [];
    const invalidUrls: string[] = [];
    for (const u of galleryUrls) {
      try {
        new URL(u);
      } catch {
        invalidUrls.push(u);
      }
    }
    if (form.coverImageUrl) {
      try {
        new URL(form.coverImageUrl);
      } catch {
        invalidUrls.push(form.coverImageUrl);
      }
    }
    if (invalidUrls.length > 0) {
      addToast({
        type: "error",
        title: "Invalid Image URL",
        message: `Use full URLs (https://…). Bad: ${invalidUrls.slice(0, 2).join(", ")}${invalidUrls.length > 2 ? "…" : ""}`,
        duration: 8000,
      });
      return;
    }

    const payload = {
      title: form.title,
      slug:
        form.slug ||
        form.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      category: form.category || undefined,
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      location: form.location || undefined,
      completionYear: form.completionYear || undefined,
      squareFootage: form.squareFootage
        ? parseInt(form.squareFootage)
        : undefined,
      coverImageUrl: form.coverImageUrl || undefined,
      galleryImageUrls: form.galleryImageUrls
        ? form.galleryImageUrls
            .split(",")
            .map((u: string) => u.trim())
            .filter(Boolean)
        : undefined,
      clientTestimonial: form.clientTestimonial || undefined,
      clientName: form.clientName || undefined,
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
        <AdminPageHeader
          title="Portfolio CMS"
          description="Manage public portfolio — publish, feature, and add project showcases"
          actions={
            <button
              onClick={() => {
                setEditId(null);
                setForm(BLANK_FORM);
                setShowForm(v => !v);
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> New Project
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            {
              label: "Total",
              value: projects?.length ?? 0,
              color: "text-foreground",
            },
            {
              label: "Published",
              value: projects?.filter(p => p.published).length ?? 0,
              color: "text-green-400",
            },
            {
              label: "Featured",
              value: projects?.filter(p => p.featured).length ?? 0,
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
                {editId ? "Edit Project" : "New Portfolio Project"}
              </p>
              <button
                onClick={() => setShowForm(false)}
                aria-label="Close project form"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <label
                  htmlFor="portfolio-title"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Project Title *
                </label>
                <input
                  id="portfolio-title"
                  value={form.title}
                  onChange={f("title")}
                  placeholder="Project title"
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div>
                <label
                  htmlFor="portfolio-category"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Category
                </label>
                <select
                  id="portfolio-category"
                  value={form.category}
                  onChange={f("category")}
                  className="w-full px-3 py-2 bg-input border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
                >
                  <option value="">Category…</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="portfolio-location"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Location
                </label>
                <input
                  id="portfolio-location"
                  value={form.location}
                  onChange={f("location")}
                  placeholder="Eugene, OR"
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div>
                <label
                  htmlFor="portfolio-year"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Year Completed
                </label>
                <input
                  id="portfolio-year"
                  value={form.completionYear}
                  onChange={f("completionYear")}
                  type="number"
                  placeholder="Year completed"
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div>
                <label
                  htmlFor="portfolio-sqft"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Square Footage
                </label>
                <input
                  id="portfolio-sqft"
                  value={form.squareFootage}
                  onChange={f("squareFootage")}
                  type="number"
                  placeholder="Square footage"
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="portfolio-cover-url"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Cover Image URL
                </label>
                <input
                  id="portfolio-cover-url"
                  value={form.coverImageUrl}
                  onChange={f("coverImageUrl")}
                  placeholder="Cover image URL"
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="portfolio-gallery-urls"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Gallery Image URLs
                </label>
                <input
                  id="portfolio-gallery-urls"
                  value={form.galleryImageUrls}
                  onChange={f("galleryImageUrls")}
                  placeholder="Comma-separated URLs"
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="portfolio-short-description"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Short Description
                </label>
                <textarea
                  id="portfolio-short-description"
                  value={form.shortDescription}
                  onChange={f("shortDescription")}
                  placeholder="Shown in portfolio grid, max 500 chars"
                  rows={2}
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label
                  htmlFor="portfolio-description"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Full Description
                </label>
                <textarea
                  id="portfolio-description"
                  value={form.description}
                  onChange={f("description")}
                  placeholder="Full project description"
                  rows={4}
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="portfolio-client-name"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Client Name
                </label>
                <input
                  id="portfolio-client-name"
                  value={form.clientName}
                  onChange={f("clientName")}
                  placeholder="For testimonial"
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>

              <div className="lg:col-span-2">
                <label
                  htmlFor="portfolio-client-testimonial"
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Client Testimonial
                </label>
                <textarea
                  id="portfolio-client-testimonial"
                  value={form.clientTestimonial}
                  onChange={f("clientTestimonial")}
                  placeholder="Client testimonial quote"
                  rows={2}
                  className="w-full px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
                />
              </div>
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
                  Publish to public site
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
                <span className="text-xs text-foreground">
                  Featured project
                </span>
              </label>
            </div>

            {/* Cover preview */}
            {form.coverImageUrl && !coverPreviewBroken && (
              <div className="mt-3 h-32 overflow-hidden border border-border/40">
                <img
                  src={form.coverImageUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={() => setCoverPreviewBroken(true)}
                />
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={!form.title || create.isPending || update?.isPending}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {(create.isPending || update?.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {editId ? "Save Changes" : "Create Project"}
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

        {/* Project list */}
        {isLoading && <SkeletonCard count={3} />}

        {!isLoading && isError && (
          <QueryError
            message="We couldn't load the portfolio. Check your connection and try again."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && (!projects || projects.length === 0) && (
          <Empty className="bg-card border border-border/60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Image />
              </EmptyMedia>
              <EmptyTitle>No portfolio projects yet</EmptyTitle>
              <EmptyDescription>
                Add your first project to start building Eric's public
                portfolio.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => {
                  setEditId(null);
                  setForm(BLANK_FORM);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Your First Project
              </button>
            </EmptyContent>
          </Empty>
        )}

        <div className="space-y-3">
          {!isLoading &&
            !isError &&
            projects?.map(p => (
              <div
                key={p.id}
                className={`bg-card border p-4 flex gap-4 ${
                  p.published
                    ? "border-border/60"
                    : "border-border/30 opacity-80"
                }`}
              >
                {/* Cover thumbnail */}
                <div className="w-20 h-16 shrink-0 border border-border/40 overflow-hidden bg-muted/20">
                  {p.cover_image_url && !brokenCovers[p.id] ? (
                    <img
                      src={p.cover_image_url}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      onError={() =>
                        setBrokenCovers(prev => ({ ...prev, [p.id]: true }))
                      }
                    />
                  ) : p.cover_image_url ? (
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
                      {p.title}
                    </p>
                    {p.featured && (
                      <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    {p.category && <span>{p.category}</span>}
                    {p.location && <span>· {p.location}</span>}
                    {p.completion_year && <span>· {p.completion_year}</span>}
                    {p.square_footage && (
                      <span>· {p.square_footage.toLocaleString()} sqft</span>
                    )}
                  </div>
                  {p.short_description && (
                    <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                      {p.short_description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Publish toggle */}
                  <button
                    onClick={() =>
                      togglePublished.mutate({
                        id: p.id,
                        published: !p.published,
                      })
                    }
                    disabled={togglePublished.isPending}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase border transition-colors ${
                      p.published
                        ? "text-green-400 border-green-400/30 bg-green-400/10 hover:bg-green-400/20"
                        : "text-muted-foreground border-border/60 hover:border-primary/40 hover:text-primary"
                    }`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {p.published ? (
                      <Globe className="h-2.5 w-2.5" />
                    ) : (
                      <EyeOff className="h-2.5 w-2.5" />
                    )}
                    {p.published ? "Live" : "Draft"}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(p)}
                    className="h-8 w-8 border border-border/60 flex items-center justify-center hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
                    title="Edit"
                    aria-label={`Edit ${p.title}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  {deleteProject && (
                    <button
                      onClick={() =>
                        setDeleteTarget({ id: p.id, title: p.title })
                      }
                      className="h-8 w-8 border border-border/60 flex items-center justify-center hover:border-red-400/40 hover:text-red-400 text-muted-foreground transition-colors"
                      title="Delete"
                      aria-label={`Delete ${p.title}`}
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
            <AlertDialogTitle>Delete portfolio project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                "{deleteTarget?.title}"
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
                  deleteProject.mutate({ id: deleteTarget.id });
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
