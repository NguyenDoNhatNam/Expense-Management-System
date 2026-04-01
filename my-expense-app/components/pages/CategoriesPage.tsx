'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/lib/AppContext';
import { getApiErrorMessage } from '@/lib/api/auth';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

type CategoryType = 'income' | 'expense';

const INITIAL_FORM = {
  name: '',
  icon: '📝',
  color: '#0ea5e9',
  type: 'expense' as CategoryType,
};

export default function CategoriesPage() {
  const { categories, addCategory, deleteCategory, currentUser } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return categories;

    return categories.filter((cat) => {
      return cat.name.toLowerCase().includes(normalized) || cat.type.includes(normalized);
    });
  }, [categories, query]);

  const expenseCategories = filteredCategories.filter((cat) => cat.type === 'expense');
  const incomeCategories = filteredCategories.filter((cat) => cat.type === 'income');

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error('Category name is required.');
      return;
    }

    const duplicated = categories.some(
      (cat) => cat.type === form.type && cat.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicated) {
      toast.error(`A ${form.type} category named "${name}" already exists.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await addCategory({
        name,
        icon: form.icon.trim() || '📝',
        color: form.color,
        type: form.type,
        userId: currentUser?.id || '',
      });

      toast.success('Category created successfully.');
      setForm(INITIAL_FORM);
      setShowAddForm(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!window.confirm(`Delete category "${categoryName}"?`)) {
      return;
    }

    try {
      await deleteCategory(categoryId);
      toast.success('Category deleted successfully.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const renderCategoryGroup = (title: string, items: typeof categories) => {
    return (
      <div>
        <h4 className="font-semibold mb-3">{title} ({items.length})</h4>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories in this group.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{cat.name}</p>
                    <p className="text-xs" style={{ color: cat.color }}>
                      {cat.color.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Categories</h2>
          <p className="text-muted-foreground mt-1">Manage income and expense categories in one dedicated page</p>
        </div>
        <Button onClick={() => setShowAddForm((prev) => !prev)}>
          {showAddForm ? 'Cancel' : '+ Add Category'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Categories</CardTitle>
          <CardDescription>Find categories by name or type</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by category name..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category Name</label>
                <Input
                  placeholder="e.g., Groceries"
                  value={form.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Icon</label>
                  <Input
                    placeholder="🛒"
                    value={form.icon}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm((prev) => ({ ...prev, icon: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForm((prev) => ({ ...prev, color: e.target.value }))
                      }
                      className="w-12 h-10 rounded border"
                    />
                    <Input
                      value={form.color}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForm((prev) => ({ ...prev, color: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={form.type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm((prev) => ({ ...prev, type: e.target.value as CategoryType }))
                    }
                    className="w-full mt-2 px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <Button type="submit" className="w-full md:w-auto">
                {isSubmitting ? 'Saving...' : 'Save Category'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>{filteredCategories.length} categories found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderCategoryGroup('Expense Categories', expenseCategories)}
          {renderCategoryGroup('Income Categories', incomeCategories)}
        </CardContent>
      </Card>
    </div>
  );
}
