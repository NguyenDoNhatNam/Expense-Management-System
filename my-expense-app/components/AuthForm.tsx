'use client';

import React from "react"
import { useState } from 'react';
import { useApp } from '@/lib/context';

export default function AuthForm() {
  const { setUser } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && !name) {
      setError('Name is required for registration');
      return;
    }

    // For demo purposes, we'll create a simple user without real authentication
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name: isLogin ? email.split('@')[0] : name,
    };

    setUser(newUser);
    localStorage.setItem('expenseapp_user', JSON.stringify(newUser));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-xl border border-border p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">ExpenseFlow</h1>
          <p className="text-muted-foreground">Manage your finances effortlessly</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isLogin
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              !isLogin
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-foreground">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border text-sm text-foreground/70">
          <p className="font-medium mb-2">Demo Account:</p>
          <p>Email: demo@example.com</p>
          <p>Password: demo123</p>
        </div>
      </div>
    </div>
  );
}
