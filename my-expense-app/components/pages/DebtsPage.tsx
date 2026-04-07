"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/AppContext";
import { useNotification } from "@/lib/notification";
import { getApiErrorMessage } from "@/lib/api/auth";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

export default function DebtsPage() {
  const { debts, addDebt, deleteDebt, currentWallet, currentUser } = useApp();
  const { showNotification } = useNotification();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    debt_type: "borrow" as "lend" | "borrow",
    person_name: "",
    amount: "",
    interest_rate: "",
    start_date: "",
    due_date: "",
    description: "",
  });

  const formatAmount = (value: number | string) => {
    const num = typeof value === "string" ? Number(value) : value;
    if (Number.isNaN(num)) return String(value);
    return num.toLocaleString("vi-VN");
  };

  const handleAddDebt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.person_name ||
      !formData.amount ||
      !formData.start_date ||
      !formData.due_date
    ) {
      showNotification("Please fill in all required fields", "warning");
      return;
    }

    if (new Date(formData.due_date) <= new Date(formData.start_date)) {
      showNotification("Due date must be after start date", "warning");
      return;
    }

    try {
      await addDebt({
        debt_type: formData.debt_type,
        person_name: formData.person_name,
        amount: parseFloat(formData.amount),
        remaining_amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interest_rate) || 0,
        start_date: new Date(formData.start_date),
        due_date: new Date(formData.due_date),
        description: formData.description,
        status: 'active',
        currency: currentWallet?.currency || "VND",
        userId: currentUser?.id || "",
      });

      setFormData({
        debt_type: "borrow",
        person_name: "",
        amount: "",
        interest_rate: "",
        start_date: "",
        due_date: "",
        description: "",
      });
      setShowForm(false);
      showNotification("Debt added successfully!", "success");
    } catch (error: any) {
      console.error(error);
      showNotification(getApiErrorMessage(error), "error");
    }
  };

  const totalDebt = debts.reduce(
    (sum, d) => sum + (d.remaining_amount || d.amount),
    0,
  );
  const totalInterest = debts.reduce(
    (sum, d) =>
      sum + (d.remaining_amount || d.amount) * (d.interest_rate / 100),
    0,
  );

  const debtsWithStatus = debts.map((debt) => ({
    ...debt,
    daysUntilDue: Math.ceil(
      (new Date(debt.due_date).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    ),
    isOverdue:
      debt.status === "overdue" || new Date(debt.due_date) < new Date(),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Debt Management</h2>
          <p className="text-muted-foreground mt-1">
            Track loans and borrowings
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Debt"}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Total Debt</p>
            <p className="text-3xl font-bold">
              {currentWallet?.currency || "VND"} {formatAmount(totalDebt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">
              Expected Interest
            </p>
            <p className="text-3xl font-bold text-destructive">
              {currentWallet?.currency || "VND"} {formatAmount(totalInterest)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">
              Number of Debts
            </p>
            <p className="text-3xl font-bold">{debts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add debt form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDebt} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Debt Type
                  </label>
                  <select
                    value={formData.debt_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        debt_type: e.target.value as "lend" | "borrow",
                      })
                    }
                    className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="borrow">Borrowed money (I owe)</option>
                    <option value="lend">Loaned money (someone owes me)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Person Name
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={formData.person_name}
                    onChange={(e) =>
                      setFormData({ ...formData, person_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Amount
                  </label>
                  <div className="flex gap-2 mt-1">
                    <span className="px-3 py-2 bg-secondary rounded-lg font-medium">
                      {currentWallet?.currency || "VND"}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Interest Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.interest_rate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interest_rate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Description (optional)
                </label>
                <Input
                  placeholder="Notes about the debt..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Add Debt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Debt list */}
      <div className="grid gap-4">
        {debtsWithStatus.length > 0 ? (
          debtsWithStatus.map((debt) => (
            <Card
              key={debt.id}
              className={debt.isOverdue ? "border-destructive" : ""}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">
                        {debt.debt_type === "borrow"
                          ? "Borrowed from"
                          : "Loaned to"}{" "}
                        {debt.person_name}
                      </h3>
                      {debt.isOverdue && (
                        <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded-full font-medium">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    {debt.description && (
                      <p className="text-sm text-muted-foreground">
                        {debt.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteDebt(debt.id)}
                  >
                    Delete
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Principal Amount
                    </p>
                    <p className="font-semibold">
                      {currentWallet?.currency || "VND"}{" "}
                      {formatAmount(debt.remaining_amount || debt.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Interest Rate
                    </p>
                    <p className="font-semibold text-destructive">
                      {debt.interest_rate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Due</p>
                    <p
                      className={`font-semibold ${debt.isOverdue ? "text-destructive" : ""}`}
                    >
                      {debt.daysUntilDue > 0
                        ? `${debt.daysUntilDue} days`
                        : "Overdue"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No debts yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
