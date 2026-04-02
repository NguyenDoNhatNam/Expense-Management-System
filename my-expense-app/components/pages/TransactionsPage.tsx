'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/AppContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import TransactionForm from '../forms/TransactionForm';
import { getApiErrorMessage } from '@/lib/api/auth';
import { useNotification } from '@/lib/notification';
import {
  BackendTransaction,
  deleteTransactionApi,
  listTransactionsApi,
} from '@/lib/api/transactions';

type Transaction = BackendTransaction;

const formatAmount = (value: number | string) => {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('vi-VN');
};

export default function TransactionsPage() {
  const { currentWallet } = useApp();
  const { showNotification } = useNotification();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchText, setSearchText] = useState('');

  const fetchTransactions = useCallback(async () => {
    if (!currentWallet) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listTransactionsApi({
        account_id: currentWallet.id,
        transaction_type: filterType === 'all' ? undefined : filterType,
        keyword: searchText || undefined,
      });

      if (result.success) {
        setTransactions(result.data);
      } else {
        throw new Error(result.message || 'An error occurred while loading the data.');
      }
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setError(message);
      showNotification(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentWallet, filterType, searchText, showNotification]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTransactions();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [fetchTransactions]);

  const deleteTransactionAPI = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const result = await deleteTransactionApi(transactionId);

      if (result.success) {
        showNotification('Transaction deleted successfully.', 'success');
        fetchTransactions();
      } else {
        throw new Error(result.message || 'Failed to delete transaction.');
      }
    } catch (error: unknown) {
      showNotification(getApiErrorMessage(error), 'error');
    }
  };

  const onFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    setEditingTransaction(null);
    fetchTransactions();
  };

  const onEditTransaction = (transaction: Transaction) => {
    setEditingId(transaction.transaction_id);
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Transactions</h2>
          <p className="text-muted-foreground mt-1">Manage your income and expenses</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : '+ Add Transaction'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Transaction' : 'Add New Transaction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm
              key={editingId || 'create'}
              editingId={editingId}
              editingTransaction={editingTransaction}
              onClose={onFormClose}
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
          onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History transactions</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${transactions.length} transactions found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">Loading data...</div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">{error}</div>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => {
                return (
                  <div
                    key={tx.transaction_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-3xl">{tx.category_icon || '📝'}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{tx.category_name}</p>
                        <p className="text-sm text-muted-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tx.transaction_date).toLocaleDateString()}
                          {tx.is_recurring && ` • Định kỳ`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-bold text-lg ${
                          tx.transaction_type === 'income' ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {tx.transaction_type === 'income' ? '+' : '-'}{' '}
                        {currentWallet?.currency || 'USD'} {formatAmount(tx.amount)}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => onEditTransaction(tx)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTransactionAPI(tx.transaction_id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No transactions found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}