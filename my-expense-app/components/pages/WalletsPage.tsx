"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/lib/AppContext";
import { getApiErrorMessage } from "@/lib/api/auth";
import { useNotification } from "@/lib/notification";
import { WalletType } from "@/lib/types";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
} from "../ui/card";
import { Input } from "../ui/input";

const WALLET_TYPES: { value: WalletType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit Card" },
  { value: "e_wallet", label: "E-Wallet" },
  { value: "investment", label: "Investment" },
];

const WALLET_TYPE_OPTIONS = WALLET_TYPES.filter((t) => t.value !== "all");

const CURRENCIES = ["VND", "USD", "EUR", "JPY", "CNY"];

const formatAmount = (value?: number, currency = "VND") => {
  return Number(value || 0).toLocaleString("vi-VN") + " " + currency;
};

const getTypeLabel = (type: string) => {
  return WALLET_TYPES.find((t) => t.value === type)?.label || type;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "cash":
      return "💵";
    case "bank":
      return "🏦";
    case "credit_card":
      return "💳";
    case "e_wallet":
      return "📱";
    case "investment":
      return "📈";
    default:
      return "💰";
  }
};

interface WalletFormData {
  name: string;
  type: WalletType;
  currency: string;
  balance: string;
  description: string;
  isIncludeInTotal: boolean;
  bankName: string;
  accountNumber: string;
}

const EMPTY_FORM: WalletFormData = {
  name: "",
  type: "cash",
  currency: "VND",
  balance: "",
  description: "",
  isIncludeInTotal: true,
  bankName: "",
  accountNumber: "",
};

export default function WalletsPage() {
  const {
    wallets,
    addWallet,
    updateWallet,
    deleteWallet,
    currentWallet,
    setCurrentWallet,
    currentUser,
  } = useApp();

  const { showNotification } = useNotification();

  // ===== FILTER STATE =====
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<WalletType | "all">("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [includeOnly, setIncludeOnly] = useState(false);

  // ===== FORM =====
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WalletFormData>({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show bank fields when type is bank, credit_card, or e_wallet
  const showBankFields = ["bank", "credit_card", "e_wallet"].includes(
    formData.type
  );

  // ===== FILTER LOGIC =====
  const filteredWallets = useMemo(() => {
    return wallets.filter((w) => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase()))
        return false;

      if (filterType !== "all" && w.type !== filterType) return false;

      if (filterCurrency !== "all" && w.currency !== filterCurrency)
        return false;

      if (includeOnly && !w.isIncludeInTotal) return false;

      return true;
    });
  }, [wallets, search, filterType, filterCurrency, includeOnly]);

  // ===== ACTIONS =====
  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showNotification("Please enter wallet name", "error");
      return;
    }

    const balanceNum = Number(formData.balance);
    if (!editingId && (isNaN(balanceNum) || balanceNum < 0)) {
      showNotification("Invalid initial balance", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateWallet(editingId, {
          name: formData.name,
          type: formData.type,
          currency: formData.currency,
          description: formData.description || undefined,
          isIncludeInTotal: formData.isIncludeInTotal,
          bankName: formData.bankName || undefined,
          accountNumber: formData.accountNumber || undefined,
        });
        showNotification("Wallet updated successfully", "success");
      } else {
        await addWallet({
          name: formData.name,
          type: formData.type,
          currency: formData.currency,
          balance: balanceNum,
          description: formData.description || undefined,
          isDefault: wallets.length === 0,
          isIncludeInTotal: formData.isIncludeInTotal,
          bankName: formData.bankName || undefined,
          accountNumber: formData.accountNumber || undefined,
          userId: currentUser?.id || "",
        });
        showNotification("Wallet created successfully", "success");
      }
      resetForm();
    } catch (err) {
      showNotification(getApiErrorMessage(err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (w: typeof wallets[0]) => {
    setEditingId(w.id);
    setFormData({
      name: w.name,
      type: w.type,
      currency: w.currency,
      balance: String(w.balance),
      description: w.description || "",
      isIncludeInTotal: w.isIncludeInTotal,
      bankName: w.bankName || "",
      accountNumber: w.accountNumber || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this wallet?")) return;

    try {
      await deleteWallet(id);
      showNotification("Wallet deleted successfully", "success");
    } catch (err) {
      showNotification(getApiErrorMessage(err), "error");
    }
  };

  // ===== STATS =====
  const totalBalance = useMemo(() => {
    return wallets
      .filter((w) => w.isIncludeInTotal)
      .reduce((sum, w) => sum + w.balance, 0);
  }, [wallets]);

  // ===== UI =====
  return (
    <div className="p-6 flex flex-col lg:flex-row gap-6">
      {/* SIDEBAR */}
      <div className="w-full lg:w-64 space-y-4">
        {/* Net Worth Card */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Net Worth</p>
            <p className="text-2xl font-bold text-green-600">
              {formatAmount(totalBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {wallets.length} wallets
            </p>
          </CardContent>
        </Card>

        <Input
          placeholder="🔍 Search wallets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div>
          <p className="font-semibold mb-2 text-sm">Wallet Type</p>
          <div className="flex flex-wrap gap-1.5">
            {WALLET_TYPES.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant={filterType === t.value ? "default" : "outline"}
                onClick={() => setFilterType(t.value)}
                className="text-xs"
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold mb-2 text-sm">Currency</p>
          <select
            className="w-full border rounded-lg p-2 text-sm"
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
          >
            <option value="all">All</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeOnly"
            checked={includeOnly}
            onChange={(e) => setIncludeOnly(e.target.checked)}
          />
          <label htmlFor="includeOnly" className="text-sm">
            Only show wallets included in total
          </label>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">My Wallets</h2>
          <Button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Cancel" : "+ Add Wallet"}
          </Button>
        </div>

        {/* FORM */}
        {showForm && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">
                {editingId ? "Edit Wallet" : "Create New Wallet"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wallet Name */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Wallet Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Bank Account"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  {/* Wallet Type */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Wallet Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as WalletType,
                        })
                      }
                      className="w-full border p-2 rounded-lg text-sm"
                    >
                      {WALLET_TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {getTypeIcon(t.value)} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Currency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData({ ...formData, currency: e.target.value })
                      }
                      className="w-full border p-2 rounded-lg text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Balance (only on create) */}
                  {!editingId && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Initial Balance
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.balance}
                        onChange={(e) =>
                          setFormData({ ...formData, balance: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {/* Bank Name (conditional) */}
                  {showBankFields && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Bank Name
                        </label>
                        <Input
                          placeholder="e.g. BIDV, Vietcombank..."
                          value={formData.bankName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bankName: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Account Number
                        </label>
                        <Input
                          placeholder="Enter account number"
                          value={formData.accountNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              accountNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Description
                  </label>
                  <Input
                    placeholder="Notes about the wallet..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                {/* Include in total */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="formInclude"
                    checked={formData.isIncludeInTotal}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isIncludeInTotal: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor="formInclude" className="text-sm">
                    Include in net worth
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Processing..."
                      : editingId
                      ? "Update"
                      : "Create Wallet"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* EMPTY STATE */}
        {filteredWallets.length === 0 && !showForm && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">💰</p>
              <p className="text-lg font-medium">No wallets yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Click &quot;+ Add Wallet&quot; to create your first wallet
              </p>
            </CardContent>
          </Card>
        )}

        {/* WALLET CARDS */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredWallets.map((w) => {
            const isActive = currentWallet?.id === w.id;

            return (
              <Card
                key={w.id}
                onClick={() => setCurrentWallet(w)}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isActive ? "border-2 border-blue-500 shadow-blue-100" : ""
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {getTypeIcon(w.type)}
                        </span>
                        <h3 className="font-bold text-lg">{w.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getTypeLabel(w.type)} • {w.currency}
                        {!w.isIncludeInTotal && (
                          <span className="ml-2 text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            Not included in total
                          </span>
                        )}
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Bank info */}
                  {w.bankName && (
                    <p className="text-xs text-muted-foreground mt-2">
                      🏦 {w.bankName}
                      {w.accountNumber && ` • ${w.accountNumber}`}
                    </p>
                  )}

                  {/* Balance */}
                  <p
                    className={`text-2xl font-bold mt-3 ${
                      w.balance >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {formatAmount(w.balance, w.currency)}
                  </p>

                  {/* Description */}
                  {w.description && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {w.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Transactions
                      </p>
                      <p className="font-medium">{w.transactionCount}</p>
                    </div>
                    <div>
                      <p className="text-green-600 text-xs">Income</p>
                      <p className="font-medium text-green-600">
                        {Number(w.totalIncome || 0).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-red-500 text-xs">Expense</p>
                      <p className="font-medium text-red-500">
                        {Number(w.totalExpense || 0).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(w);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(w.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}