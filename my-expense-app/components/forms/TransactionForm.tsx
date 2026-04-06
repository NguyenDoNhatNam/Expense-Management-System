"use client";

import React, { useMemo, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { CategoryIcon } from '@/components/ui/categoryicon';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getApiErrorMessage } from "@/lib/api/auth";
import { useNotification } from "@/lib/notification";
import {
  BackendTransaction,
  CreateTransactionPayload,
  createTransactionApi,
  updateTransactionApi,
} from "@/lib/api/transactions";

interface TransactionFormProps {
  editingId?: string | null;
  editingTransaction?: BackendTransaction | null;
  onClose: () => void;
}

interface TransactionFormData {
  type: "income" | "expense";
  amount: string;
  accountId: string;
  categoryId: string;
  description: string;
  note: string;
  location: string;
  date: string;
  isRecurring: boolean;
  recurringPattern: "daily" | "weekly" | "monthly" | "yearly";
  attachmentUrl: string;
}

const defaultFormData: TransactionFormData = {
  type: "expense",
  amount: "",
  accountId: "",
  categoryId: "",
  description: "",
  note: "",
  location: "",
  date: new Date().toISOString().split("T")[0],
  isRecurring: false,
  recurringPattern: "monthly",
  attachmentUrl: "",
};

const formatAmount = (value?: number | string) => {
  if (value === null || value === undefined) return "0";

  const raw = typeof value === "string" ? value.replace(/[^\d]/g, "") : value;

  return Number(raw || 0).toLocaleString("vi-VN");
};

const normalizeAmountInput = (value: string) => {
  return value.replace(/[^\d]/g, "");
};

export default function TransactionForm({
  editingId,
  editingTransaction,
  onClose,
}: TransactionFormProps) {
  const { categories, currentWallet, wallets } = useApp();
  const { showNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormData = useMemo<TransactionFormData>(() => {
    if (!editingTransaction) {
      return {
        ...defaultFormData,
        accountId: currentWallet?.id || "",
      };
    }

    return {
      type:
        editingTransaction.transaction_type === "income" ? "income" : "expense",
      amount: String(editingTransaction.amount),
      accountId: editingTransaction.account_id,
      categoryId: editingTransaction.category_id,
      description: editingTransaction.description || "",
      note: editingTransaction.note || "",
      location: editingTransaction.location || "",
      date: new Date(editingTransaction.transaction_date)
        .toISOString()
        .split("T")[0],
      isRecurring: Boolean(editingTransaction.is_recurring),
      recurringPattern: "monthly",
      attachmentUrl: editingTransaction.receipt_image_url || "",
    };
  }, [editingTransaction, currentWallet?.id]);

  const [formData, setFormData] =
    useState<TransactionFormData>(initialFormData);

  const sanitizedReceiptUrl = useMemo(() => {
    if (!formData.attachmentUrl) return "";
    if (formData.attachmentUrl.startsWith("blob:")) return "";
    return formData.attachmentUrl;
  }, [formData.attachmentUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.amount ||
      !formData.accountId ||
      !formData.categoryId ||
      !formData.description
    ) {
      showNotification("Please fill all required fields", "error");
      return;
    }

    const payload: CreateTransactionPayload = {
      account_id: formData.accountId,
      category_id: formData.categoryId,
      transaction_type: formData.type,
      transaction_date: `${formData.date} 00:00:00`,
      description: formData.description,
      note: formData.note,
      location: formData.location,
      receipt_image_url: sanitizedReceiptUrl,
      is_recurring: formData.isRecurring,
      recurring_id: formData.isRecurring ? "REC001" : "",
      amount: parseFloat(formData.amount),
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateTransactionApi(editingId, payload);
      } else {
        await createTransactionApi({
          account_id: payload.account_id,
          category_id: payload.category_id,
          amount: payload.amount,
          transaction_type: payload.transaction_type,
          transaction_date: payload.transaction_date,
          description: payload.description,
          note: payload.note,
          location: payload.location,
          receipt_image_url: payload.receipt_image_url,
          is_recurring: payload.is_recurring,
          recurring_id: payload.recurring_id,
        });
      }

      showNotification(
        editingId
          ? "Transaction updated successfully."
          : "Transaction created successfully.",
        "success",
      );
      onClose();
    } catch (error) {
      showNotification(getApiErrorMessage(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWallet = wallets.find((w) => w.id === formData.accountId);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");
  const relevantCategories =
    formData.type === "income" ? incomeCategories : expenseCategories;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Type</label>
          <select
            value={formData.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setFormData({
                ...formData,
                type: e.target.value as "income" | "expense",
                categoryId: "",
              });
            }}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Wallet</label>
          <select
            value={formData.accountId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData({ ...formData, accountId: e.target.value })
            }
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
            required
          >
            <option value="">Select Wallet</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name} ({wallet.currency})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            value={formData.categoryId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData({ ...formData, categoryId: e.target.value })
            }
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
            required
          >
            <option value="">Select Category</option>
            {relevantCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Amount</label>
        <div className="mt-2 flex gap-2">
          <span className="rounded-lg bg-secondary px-3 py-2 font-medium">
            {selectedWallet?.currency || "USD"}
          </span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formatAmount(formData.amount)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const raw = normalizeAmountInput(e.target.value);
              setFormData({ ...formData, amount: raw });
            }}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="What is this transaction for?"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Note</label>
        <Input
          placeholder="Optional note"
          value={formData.note}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, note: e.target.value })
          }
        />
      </div>

      <div>
        <label className="text-sm font-medium">Location</label>
        <Input
          placeholder="e.g. Ho Chi Minh City"
          value={formData.location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, location: e.target.value })
          }
        />
      </div>

      <div>
        <label className="text-sm font-medium">Date</label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, date: e.target.value })
          }
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Receipt Image</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              setFormData({ ...formData, attachmentUrl: url });
            } else {
              setFormData({ ...formData, attachmentUrl: "" });
            }
          }}
          className="mt-2"
        />
        {formData.attachmentUrl && (
          <img
            src={formData.attachmentUrl}
            alt="Receipt"
            className="mt-2 h-24 w-24 rounded-md border object-cover"
          />
        )}
        {formData.attachmentUrl.startsWith("blob:") && (
          <p className="mt-2 text-xs text-muted-foreground">
            Local preview image is not uploaded yet, so receipt URL will be
            skipped for this transaction.
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, isRecurring: e.target.checked })
            }
            className="rounded"
          />
          <span className="text-sm font-medium">
            This is a recurring transaction
          </span>
        </label>

        {formData.isRecurring && (
          <select
            value={formData.recurringPattern}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData({
                ...formData,
                recurringPattern: e.target.value as
                  | "daily"
                  | "weekly"
                  | "monthly"
                  | "yearly",
              })
            }
            className="mt-3 w-full rounded-lg border bg-background px-3 py-2"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : editingId ? "Update" : "Add"}{" "}
          Transaction
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
