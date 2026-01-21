'use client';

import { useApp } from '@/lib/context';

type Page = 'dashboard' | 'transactions' | 'budgets' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isOpen: boolean;
}

export default function Sidebar({ currentPage, onPageChange, isOpen }: SidebarProps) {
  const { user, selectedWallet } = useApp();

  const menuItems: Array<{ label: string; page: Page; icon: string }> = [
    { label: 'Dashboard', page: 'dashboard', icon: '📊' },
    { label: 'Transactions', page: 'transactions', icon: '💳' },
    { label: 'Budgets', page: 'budgets', icon: '🎯' },
    { label: 'Categories', page: 'categories', icon: '🏷️' },
    { label: 'Reports', page: 'reports', icon: '📈' },
    { label: 'Settings', page: 'settings', icon: '⚙️' },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => {}} />
      )}
      <aside
        className={`fixed lg:static top-0 left-0 h-screen w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 z-50 lg:z-auto lg:transform-none flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h2 className="text-lg font-bold text-sidebar-foreground mb-2">ExpenseFlow</h2>
          {user && (
            <div className="text-sm text-sidebar-foreground/70">
              <div>{user.name}</div>
              <div>{user.email}</div>
            </div>
          )}
        </div>

        {selectedWallet && (
          <div className="p-4 m-4 bg-sidebar-accent/10 rounded-lg border border-sidebar-border">
            <div className="text-xs text-sidebar-foreground/70 mb-1">Current Wallet</div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedWallet.color }}
              />
              <span className="font-medium text-sidebar-foreground">{selectedWallet.name}</span>
            </div>
            <div className="text-sm font-bold text-sidebar-primary mt-2">
              {selectedWallet.currency} {selectedWallet.balance.toFixed(2)}
            </div>
          </div>
        )}

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onPageChange(item.page)}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  currentPage === item.page
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/10'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/70">
          <div>Version 1.0</div>
          <div>© 2024 ExpenseFlow</div>
        </div>
      </aside>
    </>
  );
}
