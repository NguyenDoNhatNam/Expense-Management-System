"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { CategoryIcon } from "../ui/categoryicon";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { getApiErrorMessage } from "@/lib/api/auth";
import { useNotification } from "@/lib/notification";
import {
  BackendBudget,
  listBudgetsApi,
  createBudgetApi,
  updateBudgetApi,
  deleteBudgetApi,
} from "@/lib/api/budgets";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TabType = "all" | "active" | "ended" | "over";
type PeriodType = "monthly" | "quarterly" | "yearly";

type BudgetFormState = {
  categoryId: string;
  budgetName: string;
  limit: string;
  period: PeriodType;
  alertThreshold: string;
  startDate: string;
  endDate: string;
};

const INITIAL_FORM: BudgetFormState = {
  categoryId: "",
  budgetName: "",
  limit: "",
  period: "monthly",
  alertThreshold: "80",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
};

const formatAmount = (value: number | string) => {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("vi-VN");
};

const getPeriodEndDate = (startDate: string, period: PeriodType) => {
  const start = new Date(startDate);
  const end = new Date(start);

  if (period === "monthly") end.setMonth(end.getMonth() + 1);
  if (period === "quarterly") end.setMonth(end.getMonth() + 3);
  if (period === "yearly") end.setFullYear(end.getFullYear() + 1);

  return end.toISOString().split("T")[0];
};

export default function BudgetsPage() {
  const {
    categories,
    currentWallet,
  } = useApp();

  const { showNotification } = useNotification();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tab, setTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodType[]>([]);
  const [onlyActive, setOnlyActive] = useState(false);
  const [usageRange, setUsageRange] = useState<[number, number]>([0, 999]);

  const [formData, setFormData] = useState<BudgetFormState>(INITIAL_FORM);

  // ===== PAGINATION & DATA =====
  const [budgets, setBudgets] = useState<BackendBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listBudgetsApi({
        p: currentPage,
        ipp: itemsPerPage,
        search: search || undefined,
      });
      if (result.success) {
        setBudgets(result.data?.items || []);
        const pagination = result.data?.pagination;
        if (pagination) {
          setTotalPages(pagination.total_pages);
          setTotalItems(pagination.total_items);
        }
      }
    } catch (err) {
      showNotification(getApiErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, showNotification]);

  useEffect(() => {
    const timeout = setTimeout(fetchBudgets, 300);
    return () => clearTimeout(timeout);
  }, [fetchBudgets]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const filteredSidebarCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return expenseCategories;
    return expenseCategories.filter((cat) =>
      cat.name.toLowerCase().includes(q),
    );
  }, [expenseCategories, categorySearch]);

  const normalizedBudgets = useMemo(() => {
    return budgets.map((b) => {
      const limit = Number(b.amount || 0);
      const spent = Number(b.spent_amount || 0);
      const percentage = b.percentage ?? (limit > 0 ? (spent / limit) * 100 : 0);
      const isOver = percentage >= 100;

      return {
        ...b,
        category: categories.find((c) => c.id === b.category_id),
        limit,
        spent,
        percentage,
        isOver,
        isActive: b.is_active,
      };
    });
  }, [budgets, categories]);

  const filteredBudgets = useMemo(() => {
    return normalizedBudgets.filter((b) => {
      if (tab === "active" && !b.isActive) return false;
      if (tab === "ended" && b.isActive) return false;
      if (tab === "over" && !b.isOver) return false;

      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(b.category_id)) return false;
      }

      if (selectedPeriods.length > 0 && !selectedPeriods.includes(b.period as PeriodType)) {
        return false;
      }

      if (onlyActive && !b.isActive) return false;

      if (b.percentage < usageRange[0] || b.percentage > usageRange[1]) return false;

      return true;
    });
  }, [normalizedBudgets, tab, selectedCategories, selectedPeriods, onlyActive, usageRange]);

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-destructive";
    if (percent >= 80) return "bg-warning";
    return "bg-success";
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddOrUpdateBudget = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!formData.categoryId || !formData.limit || !formData.startDate) {
      showNotification("Please fill in all required fields.", "warning");
      return;
    }

    const category = categories.find((c) => c.id === formData.categoryId);
    if (!category) {
      showNotification("Selected category not found.", "error");
      return;
    }

    const endDate =
      formData.endDate ||
      getPeriodEndDate(formData.startDate, formData.period);
    const amount = Number(formData.limit);
    const alertThreshold = Number(formData.alertThreshold);

    if (Number.isNaN(amount) || amount <= 0) {
      showNotification("Budget limit must be greater than 0.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        category_id: formData.categoryId,
        budget_name: formData.budgetName.trim() || category.name,
        amount: String(amount),
        period: formData.period,
        start_date: formData.startDate,
        end_date: endDate,
        alert_threshold: alertThreshold,
      };

      if (editingId) {
        await updateBudgetApi(editingId, payload);
        showNotification("Budget updated successfully.", "success");
      } else {
        await createBudgetApi(payload);
        showNotification("Budget created successfully.", "success");
      }

      resetForm();
      fetchBudgets();
    } catch (error: unknown) {
      showNotification(getApiErrorMessage(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBudget = (budget: BackendBudget) => {
    setEditingId(budget.budget_id);
    setFormData({
      categoryId: budget.category_id || "",
      budgetName: budget.budget_name || "",
      limit: String(budget.amount || ""),
      period: (budget.period || "monthly") as PeriodType,
      alertThreshold: String(budget.alert_threshold ?? 80),
      startDate: budget.start_date || new Date().toISOString().split("T")[0],
      endDate: budget.end_date || "",
    });
    setShowForm(true);
  };

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  return (
    <div className="flex gap-6 p-6">
      {/* SIDEBAR FILTER */}
      <aside className="w-72 shrink-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Refine budgets by category, period, and usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Category</p>

              <div className="mb-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSelectedCategories(expenseCategories.map((cat) => cat.id))
                  }
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCategories([])}
                >
                  Clear
                </Button>
              </div>

              <Input
                placeholder="Search category..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="mb-3"
              />

              <div className="max-h-56 space-y-2 overflow-y-auto pr-1 rounded-lg border p-2">
                {filteredSidebarCategories.length > 0 ? (
                  filteredSidebarCategories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-secondary/60"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => handleToggleCategory(cat.id)}
                      />
                      <span className="truncate">{cat.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No categories found.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Period</p>
              <div className="space-y-2">
                {(["monthly", "quarterly", "yearly"] as PeriodType[]).map(
                  (p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPeriods.includes(p)}
                        onChange={(e) => {
                          setSelectedPeriods((prev) =>
                            e.target.checked
                              ? [...prev, p]
                              : prev.filter((x) => x !== p),
                          );
                        }}
                      />
                      <span>
                        {p === "monthly"
                          ? "Monthly"
                          : p === "quarterly"
                            ? "Quarterly"
                            : "Yearly"}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                />
                Active only
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Usage %</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Min"
                  value={usageRange[0]}
                  onChange={(e) =>
                    setUsageRange([Number(e.target.value || 0), usageRange[1]])
                  }
                />
                <Input
                  type="number"
                  min={0}
                  max={999}
                  placeholder="Max"
                  value={usageRange[1]}
                  onChange={(e) =>
                    setUsageRange([usageRange[0], Number(e.target.value || 999)])
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Budgets</h2>
            <p className="mt-1 text-muted-foreground">
              Track spending limits and manage your budget usage
            </p>
          </div>

          <Button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setEditingId(null);
                setFormData(INITIAL_FORM);
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Cancel" : "+ Add Budget"}
          </Button>
        </div>

        <Input
          placeholder="🔍 Search budgets by name..."
          className="h-12 text-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "ended", label: "Ended" },
            { key: "over", label: "Over Budget" },
          ].map((item) => (
            <Button
              key={item.key}
              variant={tab === item.key ? "default" : "outline"}
              onClick={() => setTab(item.key as TabType)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? "Edit Budget" : "Create New Budget"}
              </CardTitle>
              <CardDescription>
                Set a spending limit for a category and time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddOrUpdateBudget} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Budget Name</label>
                  <Input
                    placeholder="e.g., Monthly Food Budget"
                    value={formData.budgetName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        budgetName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const categoryId = e.target.value;
                      const selectedCategory = categories.find(
                        (c) => c.id === categoryId,
                      );
                      setFormData((prev) => ({
                        ...prev,
                        categoryId,
                        budgetName:
                          prev.budgetName || selectedCategory?.name || "",
                      }));
                    }}
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
                    required
                  >
                    <option value="">Select Category</option>
                    {expenseCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Budget Limit</label>
                    <div className="mt-2 flex gap-2">
                      <span className="rounded-lg bg-secondary px-3 py-2 font-medium">
                        {currentWallet?.currency || "USD"}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.limit}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev) => ({
                            ...prev,
                            limit: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Period</label>
                    <select
                      value={formData.period}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const period = e.target.value as PeriodType;
                        setFormData((prev) => ({
                          ...prev,
                          period,
                          endDate: prev.startDate
                            ? getPeriodEndDate(prev.startDate, period)
                            : prev.endDate,
                        }));
                      }}
                      className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      className="mt-2"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                          endDate:
                            prev.endDate ||
                            getPeriodEndDate(e.target.value, prev.period),
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      className="mt-2"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Alert Threshold (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alertThreshold}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({
                        ...prev,
                        alertThreshold: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Saving..."
                      : editingId
                        ? "Update Budget"
                        : "Create Budget"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : filteredBudgets.length > 0 ? (
            filteredBudgets.map((budget) => (
              <Card
                key={budget.budget_id}
                className={
                  budget.isOver
                    ? "border-destructive"
                    : budget.percentage >= 80
                      ? "border-warning"
                      : ""
                }
              >
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        iconName={budget.category?.icon || "Other"}
                        className="h-9 w-9"
                        color={budget.category?.color}
                      />
                      <div>
                        <p className="font-semibold">
                          {budget.budget_name || budget.category?.name || "Budget"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {budget.period === "monthly"
                            ? "Monthly"
                            : budget.period === "quarterly"
                              ? "Quarterly"
                              : "Yearly"}{" "}
                          • {budget.start_date || "-"} → {budget.end_date || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBudget(budget)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (!window.confirm("Delete this budget?")) return;
                          try {
                            await deleteBudgetApi(budget.budget_id);
                            showNotification("Budget deleted.", "success");
                            fetchBudgets();
                          } catch (err) {
                            showNotification(getApiErrorMessage(err), "error");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formatAmount(budget.spent || 0)} /{" "}
                        {formatAmount(budget.limit || 0)}{" "}
                        {currentWallet?.currency || "USD"}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          budget.isOver
                            ? "text-destructive"
                            : budget.percentage >= 80
                              ? "text-warning"
                              : "text-success"
                        }`}
                      >
                        {Number(budget.percentage || 0).toFixed(0)}%
                      </span>
                    </div>

                    <div className="h-3 w-full rounded-full bg-secondary">
                      <div
                        className={`h-3 rounded-full ${getProgressColor(
                          budget.percentage,
                        )}`}
                        style={{
                          width: `${Math.min(budget.percentage || 0, 100)}%`,
                        }}
                      />
                    </div>

                    {budget.isOver && (
                      <p className="text-xs font-medium text-destructive">
                        ⚠️ Over budget by {currentWallet?.currency || "USD"}{" "}
                        {formatAmount(
                          Number(budget.spent || 0) - Number(budget.limit || 0),
                        )}
                      </p>
                    )}

                    {!budget.isOver && budget.percentage >= 80 && (
                      <p className="text-xs font-medium text-warning">
                        ⚠️ Approaching budget limit
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No budgets found</p>
              </CardContent>
            </Card>
          )}
        </div>

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
                .filter((page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                )
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
                      className="min-w-9"
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
      </main>
    </div>
  );
}