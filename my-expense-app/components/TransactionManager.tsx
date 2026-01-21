'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

type FilterType = 'all' | 'income' | 'expense';
type SortType = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export default function TransactionManager() {
  const { transactions, categories, selectedWallet } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortType, setSortType] = useState<SortType>('date-desc');

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter((t) => !t.walletId || t.walletId === selectedWallet?.id);

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((t) => t.date <= endDate);
    }

    // Sort
    const sorted = [...filtered];
    switch (sortType) {
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'amount-desc':
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount-asc':
        sorted.sort((a, b) => a.amount - b.amount);
        break;
      default: // date-desc
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return sorted;
  }, [transactions, filterType, searchTerm, startDate, endDate, selectedCategory, sortType, selectedWallet]);

  const stats = useMemo(() => {
    const totalIncome = filteredAndSortedTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredAndSortedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [filteredAndSortedTransactions]);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        {!showForm && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
            className="py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            + Add Transaction
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <TransactionForm
            editingId={editingId}
            onComplete={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-success">
          <p className="text-sm text-muted-foreground mb-1">Total Income</p>
          <p className="text-2xl font-bold text-success">{stats.totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-destructive">
          <p className="text-sm text-muted-foreground mb-1">Total Expense</p>
          <p className="text-2xl font-bold text-destructive">{stats.totalExpense.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm border-l-4 border-l-primary">
          <p className="text-sm text-muted-foreground mb-1">Net Balance</p>
          <p
            className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-success' : 'text-destructive'}`}
          >
            {stats.balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium mb-2">
              Type
            </label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground text-sm"
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium mb-2">
              Category
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground text-sm"
            >
              <option value="all">All Categories</option>
              {expenseCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="search" className="block text-sm font-medium mb-2">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full p-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground text-sm"
            />
          </div>

          <div>
            <label htmlFor="sort" className="block text-sm font-medium mb-2">
              Sort By
            </label>
            <select
              id="sort"
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground text-sm"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 p-2 border border-border rounded-md bg-input text-foreground text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 p-2 border border-border rounded-md bg-input text-foreground text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <TransactionList transactions={filteredAndSortedTransactions} onEdit={(id) => {
        setEditingId(id);
        setShowForm(true);
      }} />
    </div>
  );
}
