'use client';

import { useApp } from '@/lib/AppContext';

type Page = 'overview' | 'transactions' | 'budgets' | 'wallets' | 'savings' | 'debts' | 'reports' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { currentUser } = useApp();

  const menuItems: Array<{ label: string; page: Page; icon: string }> = [
    { label: 'Overview', page: 'overview', icon: '📊' },
    { label: 'Transactions', page: 'transactions', icon: '💳' },
    { label: 'Budgets', page: 'budgets', icon: '🎯' },
    { label: 'Wallets', page: 'wallets', icon: '👛' },
    { label: 'Savings Goals', page: 'savings', icon: '🏦' },
    { label: 'Debts', page: 'debts', icon: '💰' },
    { label: 'Reports', page: 'reports', icon: '📈' },
    { label: 'Settings', page: 'settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border h-screen flex flex-col">
      {/* User Profile */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-lg">👤</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{currentUser?.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.page}
              onClick={() => onPageChange(item.page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                currentPage === item.page
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2024 ExpenseFlow
        </p>
      </div>
    </aside>
  );
}
