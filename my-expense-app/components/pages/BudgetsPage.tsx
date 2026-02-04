'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

export default function BudgetsPage() {
  const { budgets, categories, addBudget, updateBudget, deleteBudget, currentWallet, getTotalExpense } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: '',
    limit: '',
    period: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    alertThreshold: '80',
  });

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId || !formData.limit) {
      alert('Please fill all required fields');
      return;
    }

    addBudget({
      categoryId: formData.categoryId,
      limit: parseFloat(formData.limit),
      spent: 0,
      currency: currentWallet?.currency || 'USD',
      period: formData.period,
      alertThreshold: parseFloat(formData.alertThreshold),
      startDate: new Date(),
      userId: '',
    });

    setFormData({ categoryId: '', limit: '', period: 'monthly', alertThreshold: '80' });
    setShowForm(false);
  };

  const budgetWithCategories = budgets.map((budget) => ({
    ...budget,
    category: categories.find((c) => c.id === budget.categoryId),
    percentage: (budget.spent / budget.limit) * 100,
    isOver: budget.spent > budget.limit,
    shouldAlert: (budget.spent / budget.limit) * 100 >= budget.alertThreshold,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Budget Management</h2>
          <p className="text-muted-foreground mt-1">Set and track spending limits</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Budget'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full mt-2 px-3 py-2 border rounded-lg bg-background"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.filter((c) => c.type === 'expense').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Budget Limit</label>
                  <div className="flex gap-2 mt-2">
                    <span className="px-3 py-2 bg-secondary rounded-lg font-medium">
                      {currentWallet?.currency || 'USD'}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.limit}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, limit: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Period</label>
                  <select
                    value={formData.period}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, period: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
                    className="w-full mt-2 px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Alert Threshold (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, alertThreshold: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Create Budget
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {budgetWithCategories.length > 0 ? (
          budgetWithCategories.map((budget) => (
            <Card key={budget.id} className={budget.isOver ? 'border-destructive' : budget.shouldAlert ? 'border-warning' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{budget.category?.icon}</span>
                    <div>
                      <p className="font-semibold">{budget.category?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} • Alert at {budget.alertThreshold}%
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBudget(budget.id)}
                  >
                    Delete
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {budget.spent.toFixed(2)} / {budget.limit.toFixed(2)} {currentWallet?.currency || 'USD'}
                    </span>
                    <span className={`text-sm font-medium ${
                      budget.isOver ? 'text-destructive' : budget.shouldAlert ? 'text-warning' : 'text-success'
                    }`}>
                      {budget.percentage.toFixed(0)}%
                    </span>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        budget.isOver ? 'bg-destructive' : budget.shouldAlert ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    />
                  </div>

                  {budget.isOver && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Over budget by {currentWallet?.currency || 'USD'} {(budget.spent - budget.limit).toFixed(2)}
                    </p>
                  )}
                  {budget.shouldAlert && !budget.isOver && (
                    <p className="text-xs text-warning font-medium">
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
              <p className="text-muted-foreground">No budgets created yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
