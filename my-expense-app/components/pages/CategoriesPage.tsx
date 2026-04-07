"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Baby,
  BriefcaseBusiness,
  CircleHelp,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  Plane,
  ShoppingCart,
  Utensils,
  Wallet,
  CarFront,
  Gift,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { getApiErrorMessage } from "@/lib/api/auth";
import {
  BackendCategory,
  listCategoriesApi,
  deleteCategoryApi,
  createCategoryApi,
} from "@/lib/api/categories";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type CategoryType = "income" | "expense";

type CategoryIconKey =
  | "ShoppingCart"
  | "Utensils"
  | "Wallet"
  | "BriefcaseBusiness"
  | "Home"
  | "CarFront"
  | "HeartPulse"
  | "GraduationCap"
  | "Plane"
  | "Gamepad2"
  | "Gift"
  | "Baby"
  | "Other";

const ICON_OPTIONS: {
  value: CategoryIconKey;
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: "ShoppingCart", label: "Shopping Cart", Icon: ShoppingCart },
  { value: "Utensils", label: "Food & Dining", Icon: Utensils },
  { value: "Wallet", label: "Wallet", Icon: Wallet },
  { value: "BriefcaseBusiness", label: "Business", Icon: BriefcaseBusiness },
  { value: "Home", label: "Home", Icon: Home },
  { value: "CarFront", label: "Transport", Icon: CarFront },
  { value: "HeartPulse", label: "Health", Icon: HeartPulse },
  { value: "GraduationCap", label: "Education", Icon: GraduationCap },
  { value: "Plane", label: "Travel", Icon: Plane },
  { value: "Gamepad2", label: "Entertainment", Icon: Gamepad2 },
  { value: "Gift", label: "Gift", Icon: Gift },
  { value: "Baby", label: "Family", Icon: Baby },
  { value: "Other", label: "Other", Icon: CircleHelp },
];

const INITIAL_FORM = {
  name: "",
  icon: "ShoppingCart" as CategoryIconKey,
  color: "#0ea5e9",
  type: "expense" as CategoryType,
};

function CategoryIcon({
  iconName,
  className = "h-5 w-5",
}: {
  iconName: string;
  className?: string;
}) {
  const matched = ICON_OPTIONS.find((item) => item.value === iconName);
  if (matched) {
    const Icon = matched.Icon;
    return <Icon className={className} />;
  }

  return <span className="text-lg leading-none">{iconName || "❔"}</span>;
}

export default function CategoriesPage() {
  const { currentUser } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  // ===== PAGINATION & DATA =====
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const itemsPerPage = 10;

  // ===== DELETE DIALOG =====
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BackendCategory | null>(null);
  const [deleteAction, setDeleteAction] = useState<"delete_all" | "migrate">("delete_all");
  const [migrateTargetId, setMigrateTargetId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listCategoriesApi({
        p: currentPage,
        ipp: itemsPerPage,
        search: query || undefined,
        category_type: filterType === "all" ? undefined : filterType,
      });
      if (result.success) {
        setCategories(result.data?.items || []);
        const pagination = result.data?.pagination;
        if (pagination) {
          setTotalPages(pagination.total_pages);
          setTotalItems(pagination.total_items);
        }
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, query, filterType]);

  useEffect(() => {
    const timeout = setTimeout(fetchCategories, 300);
    return () => clearTimeout(timeout);
  }, [fetchCategories]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterType]);

  const expenseCategories = categories.filter(
    (cat) => cat.category_type === "expense",
  );
  const incomeCategories = categories.filter(
    (cat) => cat.category_type === "income",
  );

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Category name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCategoryApi({
        category_name: name,
        icon: form.icon,
        color: form.color,
        category_type: form.type,
      });

      toast.success("Category created successfully.");
      setForm(INITIAL_FORM);
      setShowAddForm(false);
      fetchCategories();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string,
    transactionCount: number,
  ) => {
    if (transactionCount > 0) {
      // Category has transactions → open dialog for user to choose action
      const cat = categories.find((c) => c.category_id === categoryId);
      if (!cat) return;
      setDeleteTarget(cat);
      setDeleteAction("delete_all");
      setMigrateTargetId("");
      setDeleteDialogOpen(true);
      return;
    }

    // No transactions → simple confirm
    if (!window.confirm(`Delete category "${categoryName}"?`)) {
      return;
    }

    try {
      await deleteCategoryApi(categoryId);
      toast.success("Category deleted successfully.");
      fetchCategories();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteAction === "migrate" && !migrateTargetId) {
      toast.error("Please select a target category to migrate transactions.");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCategoryApi(deleteTarget.category_id, {
        action: deleteAction,
        ...(deleteAction === "migrate" ? { target_category_id: migrateTargetId } : {}),
      });
      toast.success(
        deleteAction === "delete_all"
          ? "Category and all its transactions deleted."
          : "Transactions migrated and category deleted."
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchCategories();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  // Categories available as migration targets (same type, excluding the one being deleted)
  const migrationTargets = useMemo(() => {
    if (!deleteTarget) return [];
    return categories.filter(
      (c) =>
        c.category_id !== deleteTarget.category_id &&
        c.category_type === deleteTarget.category_type
    );
  }, [categories, deleteTarget]);

  const renderCategoryGroup = (title: string, items: BackendCategory[]) => {
    return (
      <div>
        <h4 className="mb-3 font-semibold">
          {title} ({items.length})
        </h4>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories in this group.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((cat) => (
              <div
                key={cat.category_id}
                className="flex items-center justify-between gap-3 rounded-xl border p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: `${cat.color || "#0ea5e9"}20`,
                      borderColor: cat.color || "#0ea5e9",
                      color: cat.color || "#0ea5e9",
                    }}
                  >
                    <CategoryIcon iconName={cat.icon || "Other"} className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cat.category_name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full border"
                        style={{ backgroundColor: cat.color || "#0ea5e9" }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {cat.category_type} • {(cat.color || "#0ea5e9").toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {!cat.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCategory(cat.category_id, cat.category_name, cat.transaction_count)}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const selectedIcon = ICON_OPTIONS.find((item) => item.value === form.icon);
  const SelectedIcon = selectedIcon?.Icon || CircleHelp;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Categories</h2>
          <p className="mt-1 text-muted-foreground">
            Manage income and expense categories in one dedicated page
          </p>
        </div>

        <Button onClick={() => setShowAddForm((prev) => !prev)}>
          {showAddForm ? "Cancel" : "+ Add Category"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Categories</CardTitle>
          <CardDescription>
            Find categories by name, type, or icon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by category name..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
          />
          <div className="flex gap-2">
            {(["all", "expense", "income"] as const).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Category</CardTitle>
            <CardDescription>
              Choose an icon and a color for the category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category Name</label>
                <Input
                  placeholder="e.g., Groceries"
                  value={form.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Icon</label>
                  <select
                    value={form.icon}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm((prev) => ({
                        ...prev,
                        icon: e.target.value as CategoryIconKey,
                      }))
                    }
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
                  >
                    {ICON_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3 flex items-center gap-3 rounded-lg border p-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full border"
                      style={{
                        backgroundColor: `${form.color}20`,
                        borderColor: form.color,
                        color: form.color,
                      }}
                    >
                      <SelectedIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {selectedIcon?.label || "Preview"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Icon preview
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForm((prev) => ({ ...prev, color: e.target.value }))
                      }
                      className="h-10 w-12 rounded border"
                    />
                    <Input
                      value={form.color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForm((prev) => ({ ...prev, color: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={form.type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm((prev) => ({
                        ...prev,
                        type: e.target.value as CategoryType,
                      }))
                    }
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full md:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Category"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading..."
              : `${totalItems} categories found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No categories found</p>
          ) : (
            <>
              {filterType !== "income" && renderCategoryGroup("Expense Categories", expenseCategories)}
              {filterType !== "expense" && renderCategoryGroup("Income Categories", incomeCategories)}
            </>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalItems} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first, last, current, and neighbors
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                      acc.push("ellipsis");
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "ellipsis" ? (
                      <span key={`e-${idx}`} className="px-1 text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={item}
                        variant={currentPage === item ? "default" : "outline"}
                        size="sm"
                        className="min-w-[36px]"
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </Button>
                    ),
                  )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== DELETE CATEGORY DIALOG ===== */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!isDeleting) {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              <strong>&quot;{deleteTarget?.category_name}&quot;</strong> has{" "}
              <strong>{deleteTarget?.transaction_count}</strong> transaction(s).
              Choose how to handle them before deleting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Option 1: Delete all transactions */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                deleteAction === "delete_all"
                  ? "border-destructive bg-destructive/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="deleteAction"
                value="delete_all"
                checked={deleteAction === "delete_all"}
                onChange={() => setDeleteAction("delete_all")}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  Delete all transactions
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permanently remove all transactions in this category. Account balances will be reverted accordingly.
                </p>
              </div>
            </label>

            {/* Option 2: Migrate transactions */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                deleteAction === "migrate"
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="deleteAction"
                value="migrate"
                checked={deleteAction === "migrate"}
                onChange={() => setDeleteAction("migrate")}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  Move to another category
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Transfer all transactions to a different category. No data will be lost.
                </p>

                {deleteAction === "migrate" && (
                  <select
                    value={migrateTargetId}
                    onChange={(e) => setMigrateTargetId(e.target.value)}
                    className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- Select target category --</option>
                    {migrationTargets.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting || (deleteAction === "migrate" && !migrateTargetId)}
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
