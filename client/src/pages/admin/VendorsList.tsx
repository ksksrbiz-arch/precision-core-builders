/**
 * Vendors — the standalone, deduped supplier catalog. Eric maintains one
 * canonical vendor list here that materials and purchase orders can reference.
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
import { useIsMobile } from "@/hooks/useMobile";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Globe,
  Mail,
  Pencil,
  Phone,
  Plus,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";

const EMPTY_FORM = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  category: "",
  accountNumber: "",
  paymentTerms: "",
  notes: "",
};

type VendorForm = typeof EMPTY_FORM;

const FIELDS: Array<{ key: keyof VendorForm; label: string; type: string }> = [
  { key: "name", label: "Vendor Name *", type: "text" },
  { key: "contactName", label: "Contact Name", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "website", label: "Website", type: "url" },
  { key: "category", label: "Category", type: "text" },
  { key: "accountNumber", label: "Account #", type: "text" },
  { key: "paymentTerms", label: "Payment Terms", type: "text" },
];

/**
 * Normalize a stored website into an absolute external URL. A value like
 * "acme.com" (no scheme) would otherwise resolve as an in-app relative link, so
 * default to https:// when no http(s) scheme is present.
 */
function externalHref(website: string): string {
  const trimmed = website.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function VendorsList() {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VendorForm>(EMPTY_FORM);
  const utils = trpc.useUtils();
  const isMobile = useIsMobile();
  const {
    data: vendors,
    isLoading,
    isError,
    refetch,
  } = trpc.vendors.list.useQuery();

  const resetForm = () => {
    setShowNew(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const createMut = useMutationWithToast(trpc.vendors.create.useMutation(), {
    success: "Vendor Added",
    successMessage: "Vendor added to your supplier catalog.",
    error: "Create Failed",
    errorMessage: "Failed to add vendor. Please try again.",
    invalidate: () => utils.vendors.list.invalidate(),
    onSuccess: resetForm,
  });

  const updateMut = useMutationWithToast(trpc.vendors.update.useMutation(), {
    success: "Vendor Updated",
    successMessage: "Vendor details saved.",
    error: "Update Failed",
    errorMessage: "Failed to update vendor. Please try again.",
    invalidate: () => utils.vendors.list.invalidate(),
    onSuccess: resetForm,
  });

  const deleteMut = useMutationWithToast(trpc.vendors.delete.useMutation(), {
    success: "Vendor Removed",
    successMessage: "Vendor deleted from your catalog.",
    error: "Delete Failed",
    errorMessage: "Failed to delete vendor. Please try again.",
    invalidate: () => utils.vendors.list.invalidate(),
  });

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowNew(true);
  };

  const startEdit = (vendor: any) => {
    setShowNew(false);
    setEditingId(vendor.id);
    setForm({
      name: vendor.name ?? "",
      contactName: vendor.contact_name ?? "",
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      website: vendor.website ?? "",
      address: vendor.address ?? "",
      category: vendor.category ?? "",
      accountNumber: vendor.account_number ?? "",
      paymentTerms: vendor.payment_terms ?? "",
      notes: vendor.notes ?? "",
    });
  };

  // On create, blank optional fields are omitted (undefined) so DB defaults
  // apply. On edit, blank fields are sent as null so the column is cleared
  // rather than silently retaining its previous value.
  const buildPayload = <E extends undefined | null>(emptyValue: E) => {
    const clean = (v: string): string | E => {
      const t = v.trim();
      return t ? t : emptyValue;
    };
    return {
      name: form.name.trim(),
      contactName: clean(form.contactName),
      email: clean(form.email),
      phone: clean(form.phone),
      website: clean(form.website),
      address: clean(form.address),
      category: clean(form.category),
      accountNumber: clean(form.accountNumber),
      paymentTerms: clean(form.paymentTerms),
      notes: clean(form.notes),
    };
  };

  const submit = () => {
    if (!form.name.trim()) return;
    if (editingId != null) {
      updateMut.mutate({ id: editingId, ...buildPayload(null) });
    } else {
      createMut.mutate(buildPayload(undefined));
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;
  const formOpen = showNew || editingId != null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <AdminPageHeader
          title="Vendors"
          guideId="vendors"
          description="Maintain one deduped supplier list so materials and purchase orders always reference the same source of truth."
          actions={
            <button
              onClick={startCreate}
              className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Vendor
            </button>
          }
        />

        {/* Create / edit form */}
        {formOpen && (
          <div className="bg-card border border-primary/30 p-6 mb-5 space-y-4">
            <p
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {editingId != null ? "Edit Vendor" : "New Vendor"}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label
                    className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e =>
                      setForm(prev => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e =>
                    setForm(prev => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1 block"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={e =>
                    setForm(prev => ({ ...prev, notes: e.target.value }))
                  }
                  rows={2}
                  className="w-full bg-input border border-border text-sm text-foreground p-2.5 focus:outline-none focus:border-primary/60 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase hover:border-primary/40 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!form.name.trim() || isSaving}
                className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold tracking-widest uppercase hover:bg-primary/85 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Vendor list */}
        {isLoading ? (
          <SkeletonCard count={4} />
        ) : isError ? (
          <QueryError
            message="We couldn't load vendors. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : !vendors?.length ? (
          <Empty className="bg-card border border-border/60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Truck />
              </EmptyMedia>
              <EmptyTitle>No vendors yet</EmptyTitle>
              <EmptyDescription>
                Build your supplier catalog so every material and purchase order
                references the same vendor record.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={startCreate}
                className="flex min-h-11 items-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-[11px] md:text-xs font-bold tracking-widest uppercase hover:bg-primary/85 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Your First Vendor
              </button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {vendors.map((vendor: any) => (
              <div
                key={vendor.id}
                className="bg-card border border-border/60 p-4 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {vendor.name}
                    </p>
                    {vendor.contact_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {vendor.contact_name}
                      </p>
                    )}
                  </div>
                  {vendor.category && (
                    <span
                      className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 border text-primary bg-primary/10 border-primary/30 shrink-0"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {vendor.category}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                  {vendor.phone && (
                    <a
                      href={`tel:${vendor.phone}`}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      {vendor.phone}
                    </a>
                  )}
                  {vendor.email && (
                    <a
                      href={`mailto:${vendor.email}`}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Mail className="h-3 w-3" />
                      {vendor.email}
                    </a>
                  )}
                  {vendor.website && (
                    <a
                      href={externalHref(vendor.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      Website
                    </a>
                  )}
                </div>

                {(vendor.account_number || vendor.payment_terms) && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-3">
                    {vendor.account_number && (
                      <span>Acct: {vendor.account_number}</span>
                    )}
                    {vendor.payment_terms && (
                      <span>Terms: {vendor.payment_terms}</span>
                    )}
                  </div>
                )}

                {/* Mobile: one-tap call / email buttons */}
                {isMobile && (vendor.phone || vendor.email) && (
                  <div className="flex gap-2 mb-3">
                    {vendor.phone && (
                      <a
                        href={`tel:${vendor.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-primary/40 bg-primary/5 text-primary text-[11px] font-bold tracking-widest uppercase active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        <Phone className="h-4 w-4" /> Call
                      </a>
                    )}
                    {vendor.email && (
                      <a
                        href={`mailto:${vendor.email}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-border/60 text-muted-foreground text-[11px] font-bold tracking-widest uppercase active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        <Mail className="h-4 w-4" /> Email
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                  <button
                    onClick={() => startEdit(vendor)}
                    className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 transition-colors"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <div className="flex-1" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        aria-label={`Remove ${vendor.name}`}
                        className="text-muted-foreground/30 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remove {vendor.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the vendor from your catalog. Materials
                          and purchase orders that referenced it keep their
                          free-text vendor name.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMut.mutate({ id: vendor.id })}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
