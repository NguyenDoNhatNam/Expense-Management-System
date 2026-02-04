'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

export default function DebtsPage() {
  const { debts, addDebt, updateDebt, deleteDebt, currentWallet } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    creditorName: '',
    interestRate: '',
    dueDate: '',
    notes: '',
  });

  const handleAddDebt = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name || !formData.amount || !formData.dueDate) {
      alert('Please fill all required fields');
      return;
    }

    addDebt({
      name: formData.name,
      amount: parseFloat(formData.amount),
      creditorName: formData.creditorName,
      interestRate: parseFloat(formData.interestRate) || 0,
      dueDate: new Date(formData.dueDate),
      notes: formData.notes,
      currency: currentWallet?.currency || 'USD',
      userId: '',
    });

    setFormData({
      name: '',
      amount: '',
      creditorName: '',
      interestRate: '',
      dueDate: '',
      notes: '',
    });
    setShowForm(false);
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalInterest = debts.reduce((sum, d) => sum + (d.amount * (d.interestRate / 100)), 0);

  const debtsWithStatus = debts.map((debt) => ({
    ...debt,
    daysUntilDue: Math.ceil((new Date(debt.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    isOverdue: new Date(debt.dueDate) < new Date(),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Debt Management</h2>
          <p className="text-muted-foreground mt-1">Track loans and debts</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Debt'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Total Debt</p>
            <p className="text-3xl font-bold">
              {currentWallet?.currency || 'USD'} {totalDebt.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Interest Accumulated</p>
            <p className="text-3xl font-bold text-destructive">
              {currentWallet?.currency || 'USD'} {totalInterest.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Active Debts</p>
            <p className="text-3xl font-bold">{debts.length}</p>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDebt} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Debt Name</label>
                  <Input
                    placeholder="e.g., Car Loan"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Creditor</label>
                  <Input
                    placeholder="e.g., Bank Name"
                    value={formData.creditorName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, creditorName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <div className="flex gap-2 mt-2">
                    <span className="px-3 py-2 bg-secondary rounded-lg font-medium">
                      {currentWallet?.currency || 'USD'}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Interest Rate (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.interestRate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, interestRate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Input
                  placeholder="Add notes about this debt..."
                  value={formData.notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Add Debt
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
        {debtsWithStatus.length > 0 ? (
          debtsWithStatus.map((debt) => (
            <Card
              key={debt.id}
              className={debt.isOverdue ? 'border-destructive' : ''}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{debt.name}</h3>
                      {debt.isOverdue && (
                        <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded-full font-medium">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    {debt.creditorName && (
                      <p className="text-sm text-muted-foreground mb-1">Creditor: {debt.creditorName}</p>
                    )}
                    {debt.notes && (
                      <p className="text-sm text-muted-foreground">{debt.notes}</p>
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
                    <p className="text-xs text-muted-foreground mb-1">Principal</p>
                    <p className="font-semibold">
                      {currentWallet?.currency || 'USD'} {debt.amount.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Interest</p>
                    <p className="font-semibold text-destructive">
                      {debt.interestRate}%
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Due</p>
                    <p className={`font-semibold ${debt.isOverdue ? 'text-destructive' : ''}`}>
                      {debt.daysUntilDue > 0 ? `${debt.daysUntilDue}d` : 'Overdue'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No debts tracked</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
