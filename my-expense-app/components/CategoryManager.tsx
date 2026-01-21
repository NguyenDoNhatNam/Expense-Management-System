'use client';

import React from "react"

import { useState } from 'react';
import { useApp } from '@/lib/context';

const ICONS = ['🍔', '🚗', '🛍️', '🎬', '💡', '💰', '💼', '📈', '🏥', '📚', '🎓', '🏠', '💍', '✈️', '🎮', '📱'];
const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#A8E6CF', '#90EE90', '#87CEEB', '#DDA0DD', '#FFB347', '#98D8C8'];

export default function CategoryManager() {
  const { categories, addCategory, updateCategory } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: COLORS[0],
    icon: ICONS[0],
    type: 'expense' as 'income' | 'expense',
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('Please enter a category name');
      return;
    }

    addCategory({
      name: formData.name,
      color: formData.color,
      icon: formData.icon,
      type: formData.type,
    });

    setFormData({
      name: '',
      color: COLORS[0],
      icon: ICONS[0],
      type: 'expense',
    });
    setShowForm(false);
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            + Add Category
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Add New Category</h2>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <label htmlFor="cat-name" className="block text-sm font-medium mb-2">
                Category Name *
              </label>
              <input
                id="cat-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="E.g. Coffee Shops"
                className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cat-type" className="block text-sm font-medium mb-2">
                  Type
                </label>
                <select
                  id="cat-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div>
                <label htmlFor="cat-icon" className="block text-sm font-medium mb-2">
                  Icon
                </label>
                <select
                  id="cat-icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full p-2 border border-border rounded-md bg-input text-foreground"
                >
                  {ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-lg border-2 transition-transform ${
                      formData.color === color ? 'border-foreground scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
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
                Add Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense Categories */}
      <div>
        <h2 className="text-lg font-bold mb-4">Expense Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenseCategories.map((cat) => (
            <div key={cat.id} className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  {cat.icon}
                </div>
                <div>
                  <h3 className="font-bold">{cat.name}</h3>
                  <p
                    className="text-sm font-medium"
                    style={{ color: cat.color }}
                  >
                    {cat.color}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Income Categories */}
      {incomeCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Income Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomeCategories.map((cat) => (
              <div key={cat.id} className="bg-card border border-border rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-bold">{cat.name}</h3>
                    <p
                      className="text-sm font-medium"
                      style={{ color: cat.color }}
                    >
                      {cat.color}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
