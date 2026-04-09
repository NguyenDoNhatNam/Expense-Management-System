"use client"

import React, { useEffect, useState } from "react"
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { adminLoginApi, getApiErrorMessage, UserRole } from "@/lib/api/auth"

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const adminUserStr = localStorage.getItem('admin_user')
    const accessToken = localStorage.getItem('access_token')

    if (!adminUserStr || !accessToken) {
      return
    }

    try {
      const parsedUser = JSON.parse(adminUserStr)
      const adminRoles: UserRole[] = ['admin', 'super_admin']
      if (parsedUser?.role && adminRoles.includes(parsedUser.role)) {
        router.replace('/admin')
      }
    } catch {
      localStorage.removeItem('admin_user')
      localStorage.removeItem('access_token')
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminLoginApi({ email, password })
      const { user, access_token } = response.data
      
      // Check if user has admin role
      const adminRoles: UserRole[] = ['admin', 'super_admin']
      if (!adminRoles.includes(user.role)) {
        setError("Bạn không có quyền truy cập trang quản trị. Vui lòng liên hệ quản trị viên.")
        setIsLoading(false)
        return
      }

      // Store tokens in localStorage
      localStorage.setItem('access_token', access_token)
  localStorage.removeItem('refresh_token')
      localStorage.setItem('admin_user', JSON.stringify(user))

  // Session cookie only; no remember-me for admin login.
  document.cookie = `admin_user=${encodeURIComponent(JSON.stringify(user))}; path=/; SameSite=Lax`

      // Redirect to admin dashboard
  router.replace("/admin")
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex font-sans">
      {/* Left side - Light Blue with Tech Pattern (60%) */}
      <div className="hidden lg:flex w-[60%] bg-[#eff6ff] relative overflow-hidden flex-col justify-between p-12">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, #bfdbfe 1px, transparent 1px), linear-gradient(to bottom, #bfdbfe 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        ></div>

        {/* Abstract SVG overlay to make it look "tech-related" */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,50 Q25,25 50,50 T100,50 T150,50" stroke="#3b82f6" strokeWidth="0.5" fill="none" />
            <path d="M0,70 Q25,45 50,70 T100,70 T150,70" stroke="#3b82f6" strokeWidth="0.5" fill="none" />
            <path d="M0,30 Q25,5 50,30 T100,30 T150,30" stroke="#3b82f6" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 mb-16 mt-8">
          <img src="/logo.png" alt="ExpenseMate Logo" className="h-32 w-auto object-contain" />
        </div>

        <div className="relative z-10 mb-auto mt-24">
          <h1 className="text-slate-900 text-5xl font-semibold leading-tight tracking-tight">
            Control Center:<br /> Management & Oversight
          </h1>
          <p className="text-slate-600 mt-6 text-lg max-w-md">
            Secure administrative access for system configuration, user management, and compliance auditing.
          </p>
        </div>
      </div>

      {/* Right side - Login Form (40%) */}
      <div className="w-full lg:w-[40%] bg-[#2563eb] flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        {/* Mobile Header (Only visible on small screens) */}
        <div className="flex lg:hidden justify-center mb-12">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm inline-block">
            <img src="/logo.png" alt="ExpenseMate Logo" className="h-10 w-auto object-contain" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 sm:p-10 max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Portal</h2>
            <p className="text-slate-500 mt-2 text-sm">
              Please enter your administrator credentials to continue.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Username / Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block" htmlFor="email">
                Administrator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                  placeholder="admin@expensemate.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-slate-700 block" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-linear-to-r from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                  Verifying...
                </>
              ) : (
                "Authorize Access"
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-xs text-slate-500">
              Authorized access only. All activities are logged and monitored.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
