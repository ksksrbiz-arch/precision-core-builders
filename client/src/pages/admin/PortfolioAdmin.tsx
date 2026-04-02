/**
 * PortfolioAdmin — Full CMS for managing public portfolio.
 * Uses portfolioRouter: listAdmin, create, update, togglePublished, delete.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
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
import { useState } from "react";
import { toast } from "sonner";

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

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.portfolio.listAdmin.useQuery();

  const create = trpc.portfolio.create.useMutation({
    onSuccess: () => {
      utils.portfolio.listAdmin.invalidate();
      toast.success("Portfolio project created");
      setShowForm(false);
      setForm(BLANK_FORM);
    },
    onError: e => toast.error(e.message),
  });

  const update = trpc.portfolio.update?.useMutation?.({
    onSuccess: () => {
      utils.portfolio.listAdmin.invalidate();
      toast.success("Project updated");
      setShowForm(false);
      setEditId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublished = trpc.portfolio.togglePublished.useMutation({
    onSuccess: data => {
      utils.portfolio.listAdmin.invalidate();
      toast.success(data.published ? "Published to portfolio" : "Unpublished");
    },
    onError: e => toast.error(e.message),
  });

  const deleteProject = trpc.portfolio.delete?.useMutation?.({
    onSuccess: () => {
      utils.portfolio.listAdmin.invalidate();
      toast.success("Project deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

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
      clientTestimonial: p.client_testimonial ?? "",
      clientName: p.client_name ?? "",
      featured: p.featured ?? false,
      published: p.published ?? false,
      sortOrder: p.sort_order ?? 0,
    });
    setShowForm(true);
  };

  const handleSave = () => {
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
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Portfolio CMS
            </h1>
            <p className="text-sm text-muted-foreground font-light mt-0.5">
              Manage public portfolio — publish, feature, and add project
              showcases
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
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-5">
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
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                value={form.title}
                onChange={f("title")}
                placeholder="Project title *"
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
                value={form.location}
                onChange={f("location")}
                placeholder="Location (Eugene, OR)"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />

              <input
                value={form.completionYear}
                onChange={f("completionYear")}
                type="number"
                placeholder="Year completed"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />

              <input
                value={form.squareFootage}
                onChange={f("squareFootage")}
                type="number"
                placeholder="Square footage"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />

              <input
                value={form.coverImageUrl}
                onChange={f("coverImageUrl")}
                placeholder="Cover image URL"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 lg:col-span-3"
              />

              <textarea
                value={form.shortDescription}
                onChange={f("shortDescription")}
                placeholder="Short description (shown in portfolio grid, max 500 chars)"
                rows={2}
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none sm:col-span-2 lg:col-span-3"
              />

              <textarea
                value={form.description}
                onChange={f("description")}
                placeholder="Full project description"
                rows={4}
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none sm:col-span-2 lg:col-span-3"
              />

              <input
                value={form.clientName}
                onChange={f("clientName")}
                placeholder="Client name (for testimonial)"
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />

              <textarea
                value={form.clientTestimonial}
                onChange={f("clientTestimonial")}
                placeholder="Client testimonial quote"
                rows={2}
                className="px-3 py-2 bg-input border border-border text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none lg:col-span-2"
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
            {form.coverImageUrl && (
              <div className="mt-3 h-32 overflow-hidden border border-border/40">
                <img
                  src={form.coverImageUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
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
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading portfolio…
            </span>
          </div>
        )}

        {!isLoading && (!projects || projects.length === 0) && (
          <div className="py-20 text-center">
            <Image className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-light mb-1">
              No portfolio projects yet
            </p>
            <p className="text-xs text-muted-foreground/60">
              Add your first project to start building Eric's public portfolio.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {projects?.map(p => (
            <div
              key={p.id}
              className={`bg-card border p-4 flex gap-4 ${
                p.published ? "border-border/60" : "border-border/30 opacity-80"
              }`}
            >
              {/* Cover thumbnail */}
              <div className="w-20 h-16 shrink-0 border border-border/40 overflow-hidden bg-muted/20">
                {p.cover_image_url ? (
                  <img
                    src={p.cover_image_url}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<div class="w-full h-full flex items-center justify-center"><span class="text-muted-foreground/30">No img</span></div>';
                    }}
                  />
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
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>

                {/* Delete */}
                {deleteProject && (
                  <button
                    onClick={() => {
                      if (
                        confirm(`Delete "${p.title}"? This cannot be undone.`)
                      ) {
                        deleteProject.mutate({ id: p.id });
                      }
                    }}
                    className="h-8 w-8 border border-border/60 flex items-center justify-center hover:border-red-400/40 hover:text-red-400 text-muted-foreground transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
