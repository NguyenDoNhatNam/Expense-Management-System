'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import TransactionForm from '../forms/TransactionForm';

export default function TransactionsPage() {
  const { transactions, categories, currentWallet, deleteTransaction } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchText, setSearchText] = useState('');

  const filteredTransactions = transactions.filter((tx) => {
    if (tx.walletId !== currentWallet?.id) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (searchText && !tx.description.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Transactions</h2>
          <p className="text-muted-foreground mt-1">Manage your income and expenses</p>
        </div>
        <Button onClick={() => { setEditingId(null); setShowForm(!showForm); }}>
          {showForm ? 'Cancel' : '+ Add Transaction'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit Transaction' : 'Add New Transaction'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm
              editingId={editingId}
              onClose={() => { setShowForm(false); setEditingId(null); }}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Input
          placeholder="Search transactions..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transactions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => {
                const category = categories.find((c) => c.id === tx.categoryId);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-3xl">{category?.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{category?.name}</p>
                        <p className="text-sm text-muted-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tx.date).toLocaleDateString()}
                          {tx.isRecurring && ` • Recurring: ${tx.recurringPattern}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {tx.type === 'income' ? '+' : '-'} {currentWallet?.currency || 'USD'} {tx.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingId(tx.id); setShowForm(true); }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTransaction(tx.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
