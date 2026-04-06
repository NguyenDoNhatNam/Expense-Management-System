"use client";

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import { useNotification } from "@/lib/notification";
import { useApp } from "@/lib/AppContext";
import { getApiErrorMessage } from "@/lib/api/auth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export default function LoginPage() {
  const { login, register } = useApp();
  const { showNotification } = useNotification();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const validateEmail = (value: string) => {
    const pattern =
      /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*(\.[a-zA-Z]{2,})+$/;
    if (!value) return "Email is required";
    if (!pattern.test(value)) return "Invalid email format";
    return "";
  };

  const validatePassword = (value: string) => {
    const pattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!pattern.test(value))
      return "Password must contain uppercase, lowercase, number, and special character";
    return "";
  };

  const validateFullName = (value: string) => {
    if (!value) return "Full name is required";
    if (value.length < 2) return "Full name is too short";
    return "";
  };

  const validatePhone = (value: string) => {
    const pattern =
      /^(\+84|0084|0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-46-9])(\d{7})$/;
    if (!value) return "Phone is required";
    if (!pattern.test(value)) return "Invalid phone format";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let valid = true;
    setEmailError("");
    setPasswordError("");
    setFullNameError("");
    setPhoneError("");

    const emailErr = validateEmail(email);
    if (emailErr) {
      setEmailError(emailErr);
      valid = false;
    }
    const passwordErr = validatePassword(password);
    if (passwordErr) {
      setPasswordError(passwordErr);
      valid = false;
    }
    if (!isLogin) {
      const fullNameErr = validateFullName(fullName);
      if (fullNameErr) {
        setFullNameError(fullNameErr);
        valid = false;
      }
      const phoneErr = validatePhone(phone);
      if (phoneErr) {
        setPhoneError(phoneErr);
        valid = false;
      }
    }
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        const res = await login(email, password, rememberMe);
        if (res && res.message && res.success) {
          showNotification(res.message, "success");
        } else {
          showNotification(res.message, "error");
        }
      } else {
        await register(email, password, fullName, phone);
        showNotification("Account created successfully!", "success");
        router.push('/verify');
      }
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      showNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Logo Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 items-center justify-center p-8">
        <div className="text-center">
          <img src="/logo.png" alt="Logo" className="object-contain" />
          <h1 className="text-4xl font-bold text-blue-600 mb-4">
            Expense Manager
          </h1>
          <p className="text-blue-400 text-lg">
            Track, manage, and optimize your finances
          </p>
        </div>
      </div>

      {/* Right Side - Login Form Section */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Manage your expenses efficiently"
                : "Start tracking your finances today"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFullName(e.target.value)
                      }
                      required
                      className="mt-2"
                      aria-invalid={!!fullNameError}
                    />
                    {fullNameError && (
                      <div className="text-xs text-destructive mt-1">
                        {fullNameError}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      type="tel"
                      placeholder="0901234567"
                      value={phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPhone(e.target.value)
                      }
                      required
                      className="mt-2"
                      aria-invalid={!!phoneError}
                    />
                    {phoneError && (
                      <div className="text-xs text-destructive mt-1">
                        {phoneError}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  required
                  className="mt-2"
                  aria-invalid={!!emailError}
                />
                {emailError && (
                  <div className="text-xs text-destructive mt-1">
                    {emailError}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                    required
                    className="mt-2 pr-10"
                    aria-invalid={!!passwordError}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {passwordError && (
                  <div className="text-xs text-destructive mt-1">
                    {passwordError}
                  </div>
                )}
              </div>

              {isLogin && ( // Add this block: Only show for login
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="rememberMe" className="text-sm font-medium">
                    Remember me
                  </label>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin
                  ? "Don't have an account?"
                  : "Already have an account?"}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setEmail("");
                    setPassword("");
                    setFullName("");
                    setPhone("");
                    setError("");
                  }}
                  className="ml-1 font-semibold text-primary hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
