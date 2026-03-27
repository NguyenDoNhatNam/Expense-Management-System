'use client';

import React, { useState } from 'react';
import { AdminUser } from './AdminDashboard';

interface UsersTableProps {
  users: AdminUser[];
  onDeleteUser: (id: string) => void;
}

export default function UsersTable({ users, onDeleteUser }: UsersTableProps) {
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const confirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">User Management</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">Manage all registered users in the system</p>

          <div className="relative max-w-full">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search users by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              {users.length === 0 ? "No users registered yet" : "No users found matching your search."}
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">User</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Join Date</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-center">Wallets</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-center">Budgets</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-center">Transactions</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-[#3b82f6] flex items-center justify-center font-bold text-sm shrink-0">
                          {user.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{user.joinDate}</td>
                    <td className="px-6 py-4 text-center font-medium bg-gray-50/30">{user.walletsCount}</td>
                    <td className="px-6 py-4 text-center font-medium">{user.budgetsCount}</td>
                    <td className="px-6 py-4 text-center font-medium bg-gray-50/30">{user.transactionsCount}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete <span className="font-semibold text-gray-700">{userToDelete.name}</span>? This action cannot be undone and will remove all their data.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 rounded-lg transition-colors"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
