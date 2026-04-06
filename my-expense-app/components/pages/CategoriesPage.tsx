"use client";

import { useMemo, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { getApiErrorMessage } from "@/lib/api/auth";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";

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
  const { categories, addCategory, deleteCategory, currentUser } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return categories;

    return categories.filter((cat) => {
      return (
        cat.name.toLowerCase().includes(normalized) ||
        cat.type.toLowerCase().includes(normalized) ||
        cat.icon.toLowerCase().includes(normalized)
      );
    });
  }, [categories, query]);

  const expenseCategories = filteredCategories.filter(
    (cat) => cat.type === "expense",
  );
  const incomeCategories = filteredCategories.filter(
    (cat) => cat.type === "income",
  );

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Category name is required.");
      return;
    }

    const duplicated = categories.some(
      (cat) =>
        cat.type === form.type &&
        cat.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicated) {
      toast.error(`A ${form.type} category named "${name}" already exists.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await addCategory({
        name,
        icon: form.icon,
        color: form.color,
        type: form.type,
        userId: currentUser?.id || "",
      });

      toast.success("Category created successfully.");
      setForm(INITIAL_FORM);
      setShowAddForm(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string,
  ) => {
    if (!window.confirm(`Delete category "${categoryName}"?`)) {
      return;
    }

    try {
      await deleteCategory(categoryId);
      toast.success("Category deleted successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const renderCategoryGroup = (title: string, items: typeof categories) => {
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
                key={cat.id}
                className="flex items-center justify-between gap-3 rounded-xl border p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: `${cat.color}20`,
                      borderColor: cat.color,
                      color: cat.color,
                    }}
                  >
                    <CategoryIcon iconName={cat.icon} className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cat.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full border"
                        style={{ backgroundColor: cat.color }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {cat.type} • {cat.color.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
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
        <CardContent>
          <Input
            placeholder="Search by category name..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
          />
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
            {filteredCategories.length} categories found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderCategoryGroup("Expense Categories", expenseCategories)}
          {renderCategoryGroup("Income Categories", incomeCategories)}
        </CardContent>
      </Card>
    </div>
  );
}
