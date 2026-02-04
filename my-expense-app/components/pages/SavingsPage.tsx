'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

export default function SavingsPage() {
  const { savingsGoals, wallets, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, currentWallet } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    description: '',
  });

  const handleAddGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name || !formData.targetAmount || !formData.deadline) {
      alert('Please fill all required fields');
      return;
    }

    addSavingsGoal({
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      deadline: new Date(formData.deadline),
      priority: formData.priority,
      description: formData.description,
      walletId: currentWallet!.id,
      currency: currentWallet?.currency || 'USD',
      userId: '',
    });

    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      priority: 'medium',
      description: '',
    });
    setShowForm(false);
  };

  const goalsWithProgress = savingsGoals
    .filter((g) => g.walletId === currentWallet?.id)
    .map((goal) => ({
      ...goal,
      progress: (goal.currentAmount / goal.targetAmount) * 100,
      remaining: goal.targetAmount - goal.currentAmount,
      daysLeft: Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Savings Goals</h2>
          <p className="text-muted-foreground mt-1">Track your financial targets</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Goal'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Savings Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Goal Name</label>
                <Input
                  placeholder="e.g., Vacation Fund"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Target Amount</label>
                  <div className="flex gap-2 mt-2">
                    <span className="px-3 py-2 bg-secondary rounded-lg font-medium">
                      {currentWallet?.currency || 'USD'}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.targetAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, targetAmount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Current Amount</label>
                  <div className="flex gap-2 mt-2">
                    <span className="px-3 py-2 bg-secondary rounded-lg font-medium">
                      {currentWallet?.currency || 'USD'}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.currentAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, currentAmount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Target Date</label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full mt-2 px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Add notes about this goal..."
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Create Goal
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
        {goalsWithProgress.length > 0 ? (
          goalsWithProgress.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{goal.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        goal.priority === 'high' ? 'bg-destructive/20 text-destructive' :
                        goal.priority === 'medium' ? 'bg-warning/20 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {goal.priority.toUpperCase()}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSavingsGoal(goal.id)}
                  >
                    Delete
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {goal.currentAmount.toFixed(2)} / {goal.targetAmount.toFixed(2)} {currentWallet?.currency || 'USD'}
                    </span>
                    <span className="text-sm font-medium">{goal.progress.toFixed(0)}%</span>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-success"
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Remaining: {currentWallet?.currency || 'USD'} {goal.remaining.toFixed(2)}</span>
                    <span>{goal.daysLeft > 0 ? `${goal.daysLeft} days left` : 'Deadline passed'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No savings goals yet. Start planning!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
