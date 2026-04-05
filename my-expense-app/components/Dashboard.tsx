"use client";

import { useState } from "react";
import { useApp } from "@/lib/AppContext";
import Sidebar from "@/components/Sidebar";
import DashboardPage from "@/components/pages/DashboardPage";
import TransactionsPage from "@/components/pages/TransactionsPage";
import BudgetsPage from "@/components/pages/BudgetsPage";
import WalletsPage from "@/components/pages/WalletsPage";
import SavingsPage from "@/components/pages/SavingsPage";
import DebtsPage from "@/components/pages/DebtsPage";
import CategoriesPage from "@/components/pages/CategoriesPage";
import SettingsPage from "@/components/pages/SettingsPage";

type Page =
  | "dashboard"
  | "transactions"
  | "budgets"
  | "wallets"
  | "savings"
  | "debts"
  | "categories"
  | "settings";

export default function Dashboard() {
  const { logout } = useApp();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "transactions":
        return <TransactionsPage />;
      case "budgets":
        return <BudgetsPage />;
      case "wallets":
        return <WalletsPage />;
      case "savings":
        return <SavingsPage />;
      case "debts":
        return <DebtsPage />;
      case "categories":
        return <CategoriesPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b bg-card p-4 flex items-center justify-between">
          <div className="relative h-20 w-20">
            <img
              src="/logo2.png"
              alt="ExpenseFlow logo"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <h1 className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-blue-500 drop-shadow-lg ml-35">
              ExpenseMate
            </h1>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}
