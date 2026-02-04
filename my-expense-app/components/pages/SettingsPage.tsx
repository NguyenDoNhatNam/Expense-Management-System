'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

export default function SettingsPage() {
  const { currentUser, categories, addCategory } = useApp();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '📝',
    color: '#8b5cf6',
    type: 'expense' as 'income' | 'expense',
  });

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const handleAddCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newCategory.name) {
      alert('Please enter a category name');
      return;
    }

    addCategory({
      name: newCategory.name,
      icon: newCategory.icon,
      color: newCategory.color,
      type: newCategory.type,
      userId: '',
    });

    setNewCategory({
      name: '',
      icon: '📝',
      color: '#8b5cf6',
      type: 'expense',
    });
    setShowAddCategory(false);
  };

  const handleExportData = () => {
    const data = {
      user: currentUser,
      categories,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenseflow-backup.json';
    a.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          // In a real app, you would parse and import the data
          alert('Import functionality would restore your data from backup');
        } catch (error) {
          alert('Failed to import data');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your preferences and categories</p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={currentUser?.fullName || ''}
                disabled
                className="mt-2 bg-secondary"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={currentUser?.email || ''}
                disabled
                className="mt-2 bg-secondary"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Account created: {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Categories Management */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Manage transaction categories</CardDescription>
          </div>
          <Button onClick={() => setShowAddCategory(!showAddCategory)}>
            {showAddCategory ? 'Cancel' : '+ Add Category'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {showAddCategory && (
            <form onSubmit={handleAddCategory} className="p-4 border rounded-lg space-y-4 bg-secondary/50">
              <div>
                <label className="text-sm font-medium">Category Name</label>
                <Input
                  placeholder="e.g., Groceries"
                  value={newCategory.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory({ ...newCategory, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Icon</label>
                  <Input
                    placeholder="🛒"
                    value={newCategory.icon}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="color"
                      value={newCategory.color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-12 h-10 rounded border"
                    />
                    <Input
                      value={newCategory.color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory({ ...newCategory, color: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={newCategory.type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCategory({ ...newCategory, type: e.target.value as 'income' | 'expense' })}
                    className="w-full mt-2 px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Add Category
                </Button>
              </div>
            </form>
          )}

          <div>
            <h4 className="font-semibold mb-3">Expense Categories ({expenseCategories.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 p-3 rounded-lg border"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{cat.name}</p>
                    <p className="text-xs text-muted-foreground" style={{ color: cat.color }}>
                      ●● {cat.color.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Income Categories ({incomeCategories.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {incomeCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 p-3 rounded-lg border"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{cat.name}</p>
                    <p className="text-xs text-muted-foreground" style={{ color: cat.color }}>
                      ●● {cat.color.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Backup and restore your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm mb-3">Export all your data to keep a secure backup</p>
            <Button onClick={handleExportData} variant="outline" className="w-full bg-transparent">
              📥 Export Data Backup
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm mb-3">Restore data from a previous backup file</p>
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <Button variant="outline" className="w-full cursor-pointer bg-transparent">
                📤 Import Data Backup
              </Button>
            </label>
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <p className="text-sm text-warning">
              ⚠️ <span className="font-medium">Note:</span> Your data is stored locally in your browser. Clearing browser data will remove everything.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About ExpenseFlow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Version:</span> 1.0.0
            </p>
            <p>
              <span className="font-medium">Made with:</span> Next.js, React, Tailwind CSS, Recharts
            </p>
            <p className="text-muted-foreground">
              ExpenseFlow is a comprehensive expense management application designed to help you track spending, manage budgets, and achieve your financial goals.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
