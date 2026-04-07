"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/AppContext";
import { Button } from "../ui/button";
import { CategoryIcon } from "../ui/categoryicon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import TransactionForm from "../forms/TransactionForm";
import { getApiErrorMessage } from "@/lib/api/auth";
import { useNotification } from "@/lib/notification";
import {
  BackendTransaction,
  deleteTransactionApi,
  listTransactionsApi,
} from "@/lib/api/transactions";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Transaction = BackendTransaction;

const formatAmount = (value: number | string) => {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("vi-VN");
};

export default function TransactionsPage() {
  const { currentWallet, categories } = useApp();
  const { showNotification } = useNotification();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ===== BASIC FILTER =====
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "income" | "expense" | "transfer"
  >("all");

  // ===== ADVANCED FILTER =====
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // ===== SORT =====
  const [sortBy, setSortBy] = useState("newest");

  // ===== PAGINATION =====
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // ===== FORM =====
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // ===== FETCH =====
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await listTransactionsApi({
        keyword: searchText || undefined,
        transaction_type:
          filterType === "all" ? undefined : filterType,
        start_date: dateFrom || undefined,
        end_date: dateTo || undefined,
        min_amount: minAmount || undefined,
        max_amount: maxAmount || undefined,
        category_ids: selectedCategories.length
          ? selectedCategories.join(',')
          : undefined,
        sort_by: sortBy,
        p: currentPage,
        ipp: itemsPerPage,
      });

      if (result.success) {
        setTransactions(result.data?.transactions || []);
        const pagination = result.data?.pagination;
        if (pagination) {
          setTotalPages(pagination.total_pages);
          setTotalItems(pagination.total_items);
        }
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      showNotification(getApiErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    searchText,
    filterType,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    selectedCategories,
    sortBy,
    currentPage,
    showNotification,
  ]);

  // debounce
  useEffect(() => {
    const timeout = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(timeout);
  }, [fetchTransactions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterType, dateFrom, dateTo, minAmount, maxAmount, selectedCategories, sortBy]);

  // ===== ACTIONS =====
  const deleteTransaction = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;

    try {
      const res = await deleteTransactionApi(id);
      if (res.success) {
        showNotification("Deleted successfully", "success");
        fetchTransactions();
      }
    } catch (err) {
      showNotification(getApiErrorMessage(err), "error");
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  // ===== UI =====
  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Transactions</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add"}
        </Button>
      </div>

      {/* SEARCH */}
      <Input
        placeholder="🔍 Search description or notes..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="h-12 text-lg"
      />

      {/* TABS */}
      <div className="flex gap-2">
        {["all", "income", "expense", "transfer"].map((type) => (
          <Button
            key={type}
            variant={filterType === type ? "default" : "outline"}
            onClick={() => setFilterType(type as any)}
          >
            {type}
          </Button>
        ))}
      </div>

      {/* SORT + ADVANCED */}
      <div className="flex gap-4">
        <select
          className="border px-3 py-2 rounded-lg"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="amount_desc">Amount ↓</option>
          <option value="amount_asc">Amount ↑</option>
        </select>

        <Button onClick={() => setShowAdvanced(true)}>
          Advanced Filter
        </Button>
      </div>

      {/* FORM */}
      {showForm && (
        <Card>
          <CardContent>
            <TransactionForm
              editingId={editingId}
              editingTransaction={editingTransaction}
              onClose={() => {
                setShowForm(false);
                fetchTransactions();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading..."
              : `${totalItems} results`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-center py-10">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">
              No transactions found
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.transaction_id}
                  className="flex justify-between p-4 border rounded-lg"
                >
                  <div className="flex gap-4">
                    <CategoryIcon
                      iconName={tx.category_icon || "Other"}
                      color={tx.category_color}
                    />
                    <div>
                      <p className="font-semibold">
                        {tx.category_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        tx.transaction_type === "income"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {tx.transaction_type === "income" ? "+" : "-"}
                      {formatAmount(tx.amount)}
                    </p>

                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingId(tx.transaction_id);
                          setEditingTransaction(tx);
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          deleteTransaction(tx.transaction_id)
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4 mt-4">
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
        </CardContent>
      </Card>

      {/* ADVANCED MODAL */}
      {showAdvanced && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-[500px] space-y-4">
            <h3 className="text-xl font-bold">Advanced Filters</h3>

            {/* DATE */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* AMOUNT */}
            <div className="flex gap-2">
              <Input
                placeholder="Min amount"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
              <Input
                placeholder="Max amount"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>

            {/* CATEGORY */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={
                    selectedCategories.includes(cat.id)
                      ? "default"
                      : "outline"
                  }
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAdvanced(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowAdvanced(false);
                  fetchTransactions();
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}