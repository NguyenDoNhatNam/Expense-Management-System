'use client';

import React from "react"

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  description?: string;
}

export default function SavingsGoals() {
  const { currency } = useApp();
  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem('expenseapp_goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    dueDate: '',
    priority: 'medium' as const,
    description: '',
  });

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.targetAmount || !formData.dueDate) {
      alert('Please fill in required fields');
      return;
    }

    const newGoal: SavingsGoal = {
      id: Date.now().toString(),
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      dueDate: formData.dueDate,
      priority: formData.priority,
      description: formData.description,
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    localStorage.setItem('expenseapp_goals', JSON.stringify(updatedGoals));

    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      dueDate: '',
      priority: 'medium',
      description: '',
    });
    setShowForm(false);
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm('Delete this goal?')) {
      const updatedGoals = goals.filter((g) => g.id !== id);
      setGoals(updatedGoals);
      localStorage.setItem('expenseapp_goals', JSON.stringify(updatedGoals));
    }
  };

  const handleUpdateGoal = (id: string, updates: Partial<SavingsGoal>) => {
    const updatedGoals = goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
    setGoals(updatedGoals);
    localStorage.setItem('expenseapp_goals', JSON.stringify(updatedGoals));
  };

  const stats = useMemo(() => {
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const activeGoals = goals.filter((g) => new Date(g.dueDate) > new Date());
    const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount);

    return { totalTarget, totalSaved, activeGoals, completedGoals };
  }, [goals]);

  const sortedGoals = [...goals].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Savings Goals</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            + Set Goal
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-primary">
          <p className="text-sm text-muted-foreground mb-1">Total Target</p>
          <p className="text-2xl font-bold">{stats.totalTarget.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-success">
          <p className="text-sm text-muted-foreground mb-1">Total Saved</p>
          <p className="text-2xl font-bold text-success">{stats.totalSaved.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-accent">
          <p className="text-sm text-muted-foreground mb-1">Active Goals</p>
          <p className="text-2xl font-bold">{stats.activeGoals.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-info">
          <p className="text-sm text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-bold">{stats.completedGoals.length}</p>
        </div>
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Create Savings Goal</h2>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="goal-name" className="block text-sm font-medium mb-2">
                  Goal Name *
                </label>
                <input
                  id="goal-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="E.g. Vacation Fund"
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground"
                  required
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="target-amount" className="block text-sm font-medium mb-2">
                  Target Amount *
                </label>
                <div className="flex items-center border border-border rounded-lg bg-input overflow-hidden">
                  <span className="px-3 text-muted-foreground font-medium">{currency}</span>
                  <input
                    id="target-amount"
                    type="number"
                    step="0.01"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 p-2 bg-input text-foreground placeholder-muted-foreground outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="current-amount" className="block text-sm font-medium mb-2">
                  Current Amount
                </label>
                <div className="flex items-center border border-border rounded-lg bg-input overflow-hidden">
                  <span className="px-3 text-muted-foreground font-medium">{currency}</span>
                  <input
                    id="current-amount"
                    type="number"
                    step="0.01"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 p-2 bg-input text-foreground placeholder-muted-foreground outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="due-date" className="block text-sm font-medium mb-2">
                  Target Date *
                </label>
                <input
                  id="due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="py-2 px-6 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      {sortedGoals.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 shadow-sm text-center">
          <p className="text-muted-foreground text-lg">No savings goals yet</p>
          <p className="text-muted-foreground text-sm mt-2">Create goals to track your savings progress</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGoals.map((goal) => {
            const percentage = (goal.currentAmount / goal.targetAmount) * 100;
            const daysLeft = Math.ceil(
              (new Date(goal.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            return (
              <div key={goal.id} className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold">{goal.name}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          isCompleted
                            ? 'bg-success/20 text-success'
                            : goal.priority === 'high'
                              ? 'bg-destructive/20 text-destructive'
                              : goal.priority === 'medium'
                                ? 'bg-warning/20 text-warning'
                                : 'bg-secondary/20 text-foreground'
                        }`}
                      >
                        {isCompleted ? '✓ Completed' : goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                      </span>
                    </div>
                    {goal.description && <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                  >
                    🗑
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-bold">{percentage.toFixed(1)}%</span>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all ${isCompleted ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">
                      {currency} {goal.currentAmount.toFixed(2)} / {goal.targetAmount.toFixed(2)}
                    </span>
                    <span className={`${daysLeft > 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {daysLeft > 0 ? `${daysLeft} days left` : 'Due date passed'}
                    </span>
                  </div>
                </div>

                {/* Update Current Amount */}
                <div className="mt-4 pt-4 border-t border-border">
                  <label htmlFor={`update-${goal.id}`} className="block text-xs font-medium mb-2">
                    Update saved amount:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={`update-${goal.id}`}
                      type="number"
                      step="0.01"
                      defaultValue={goal.currentAmount}
                      className="flex-1 p-2 border border-border rounded-md bg-input text-foreground text-sm"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`update-${goal.id}`) as HTMLInputElement;
                        if (input) {
                          handleUpdateGoal(goal.id, { currentAmount: parseFloat(input.value) });
                        }
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity text-sm"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
