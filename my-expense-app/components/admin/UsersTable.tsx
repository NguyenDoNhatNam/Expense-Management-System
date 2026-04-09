'use client';

import React, { useState } from 'react';
import { AdminUser } from './AdminDashboard';
import { ToggleLeft, ToggleRight, Trash2, Shield, User } from 'lucide-react';

interface UsersTableProps {
  users: AdminUser[];
  onDeleteUser: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export default function UsersTable({ users, onDeleteUser, onToggleStatus }: UsersTableProps) {
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
          <h3 className="text-lg font-bold text-gray-900">Quản lý người dùng</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">Quản lý tất cả người dùng đã đăng ký trong hệ thống</p>

          <div className="relative max-w-full">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo email hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              {users.length === 0 ? "Chưa có người dùng nào đăng ký" : "Không tìm thấy người dùng phù hợp."}
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Người dùng</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Vai trò</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Ngày tham gia</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-center">Ví</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-center">Ngân sách</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-center">Giao dịch</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${user.isActive ? 'bg-blue-100 text-[#3b82f6]' : 'bg-gray-100 text-gray-400'}`}>
                          {user.avatar}
                        </div>
                        <div>
                          <div className={`font-semibold ${user.isActive ? 'text-gray-900' : 'text-gray-400'}`}>{user.name}</div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.joinDate}</td>
                    <td className="px-6 py-4 text-center font-medium bg-gray-50/30">{user.walletsCount}</td>
                    <td className="px-6 py-4 text-center font-medium">{user.budgetsCount}</td>
                    <td className="px-6 py-4 text-center font-medium bg-gray-50/30">{user.transactionsCount}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {onToggleStatus && user.role !== 'admin' && (
                          <button
                            onClick={() => onToggleStatus(user.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive 
                                ? 'text-amber-600 hover:bg-amber-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          >
                            {user.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa người dùng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
              <h3 className="text-lg font-bold text-gray-900">Xóa người dùng</h3>
              <p className="text-sm text-gray-500 mt-2">
                Bạn có chắc chắn muốn xóa <span className="font-semibold text-gray-700">{userToDelete.name}</span>? Hành động này sẽ vô hiệu hóa tài khoản của họ.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 rounded-lg transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
