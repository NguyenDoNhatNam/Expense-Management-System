'use client';

import { Transaction } from '@/lib/context';
import { useApp } from '@/lib/context';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (id: string) => void;
}

export default function TransactionList({ transactions, onEdit }: TransactionListProps) {
  const { deleteTransaction, categories } = useApp();

  if (transactions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 shadow-sm text-center">
        <p className="text-muted-foreground text-lg">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left p-4 font-bold text-sm">Date</th>
              <th className="text-left p-4 font-bold text-sm">Category</th>
              <th className="text-left p-4 font-bold text-sm">Description</th>
              <th className="text-left p-4 font-bold text-sm">Type</th>
              <th className="text-right p-4 font-bold text-sm">Amount</th>
              <th className="text-center p-4 font-bold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const category = categories.find((c) => c.name === transaction.category);
              return (
                <tr key={transaction.id} className="border-b border-border hover:bg-secondary/10 transition-colors">
                  <td className="p-4">{transaction.date}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category?.icon}</span>
                      <span>{transaction.category}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground text-sm">{transaction.description}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'income'
                          ? 'bg-success/20 text-success'
                          : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {transaction.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`font-bold ${
                        transaction.type === 'income' ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {transaction.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(transaction.id)}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this transaction?')) {
                            deleteTransaction(transaction.id);
                          }
                        }}
                        className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="space-y-3 p-4">
          {transactions.map((transaction) => {
            const category = categories.find((c) => c.name === transaction.category);
            return (
              <div key={transaction.id} className="p-4 border border-border rounded-lg bg-secondary/30">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category?.icon}</span>
                    <div>
                      <div className="font-bold text-sm">{transaction.category}</div>
                      <div className="text-xs text-muted-foreground">{transaction.date}</div>
                    </div>
                  </div>
                  <span
                    className={`font-bold ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {transaction.amount.toFixed(2)}
                  </span>
                </div>

                {transaction.description && (
                  <div className="text-xs text-muted-foreground mb-3">{transaction.description}</div>
                )}

                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'income'
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {transaction.type === 'income' ? 'Income' : 'Expense'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(transaction.id)}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors text-sm"
                    >
                      ✎ Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this transaction?')) {
                          deleteTransaction(transaction.id);
                        }
                      }}
                      className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors text-sm"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
