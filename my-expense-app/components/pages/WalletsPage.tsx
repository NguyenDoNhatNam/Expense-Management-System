"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/lib/AppContext";
import { getApiErrorMessage } from "@/lib/api/auth";
import { useNotification } from "@/lib/notification";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";

const WALLET_TYPES = [
  "all",
  "cash",
  "bank",
  "credit",
  "ewallet",
  "investment",
];

const CURRENCIES = [
  "USD",
  "EUR",
  "VND",
  "JPY",
  "CNY",
];

const formatAmount = (value?: number) => {
  return Number(value || 0).toLocaleString("vi-VN");
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
  const [type, setType] = useState("all");
  const [currency, setCurrency] = useState("all");
  const [includeOnly, setIncludeOnly] = useState(false);

  // ===== FORM =====
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "cash",
    currency: "VND",
    balance: "",
    description: "",
    is_include_in_total: true,
  });

  // ===== FILTER LOGIC =====
  const filteredWallets = useMemo(() => {
    return wallets.filter((w: any) => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase()))
        return false;

      if (type !== "all" && w.type !== type) return false;

      if (currency !== "all" && w.currency !== currency) return false;

      if (includeOnly && !w.is_include_in_total) return false;

      return true;
    });
  }, [wallets, search, type, currency, includeOnly]);

  // ===== ACTIONS =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateWallet(editingId, formData);
        showNotification("Updated", "success");
      } else {
        await addWallet({
          ...formData,
          balance: Number(formData.balance),
          userId: currentUser?.id,
        });
        showNotification("Created", "success");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: "",
        type: "cash",
        currency: "VND",
        balance: "",
        description: "",
        is_include_in_total: true,
      });
    } catch (err) {
      showNotification(getApiErrorMessage(err), "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete wallet?")) return;

    try {
      await deleteWallet(id);
      showNotification("Deleted", "success");
    } catch (err) {
      showNotification(getApiErrorMessage(err), "error");
    }
  };

  // ===== UI =====
  return (
    <div className="p-6 flex gap-6">
      {/* SIDEBAR */}
      <div className="w-64 space-y-4">
        <Input
          placeholder="🔍 Search wallet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div>
          <p className="font-semibold mb-2">Type</p>
          <div className="flex flex-wrap gap-2">
            {WALLET_TYPES.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={type === t ? "default" : "outline"}
                onClick={() => setType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold mb-2">Currency</p>
          <select
            className="w-full border rounded-lg p-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="all">All</option>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeOnly}
            onChange={(e) => setIncludeOnly(e.target.checked)}
          />
          <span className="text-sm">Include in total only</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Wallets</h2>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add"}
          </Button>
        </div>

        {/* FORM */}
        {showForm && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Wallet name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />

                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full border p-2 rounded-lg"
                >
                  {WALLET_TYPES.slice(1).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>

                <Input
                  placeholder="Balance"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({ ...formData, balance: e.target.value })
                  }
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_include_in_total}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_include_in_total: e.target.checked,
                      })
                    }
                  />
                  Include in total
                </div>

                <Button type="submit">Save</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* LIST */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredWallets.map((w: any) => {
            const isActive = currentWallet?.id === w.id;

            return (
              <Card
                key={w.id}
                onClick={() => setCurrentWallet(w)}
                className={`cursor-pointer ${
                  isActive ? "border-2 border-blue-500" : ""
                }`}
              >
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg">{w.name}</h3>

                  <p className="text-sm text-muted-foreground">
                    {w.type} • {w.currency}
                  </p>

                  <p
                    className={`text-2xl font-bold mt-2 ${
                      w.balance >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {formatAmount(w.balance)}
                  </p>

                  {/* STATS */}
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>Transactions: {w.transaction_count || 0}</p>
                    <p className="text-green-500">
                      Income: {formatAmount(w.total_income)}
                    </p>
                    <p className="text-red-500">
                      Expense: {formatAmount(w.total_expense)}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(w.id);
                        setFormData(w);
                        setShowForm(true);
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