'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Settings, ArrowLeft } from 'lucide-react';
import { verifyActivationApi, resendOtpApi, getApiErrorMessage } from '@/lib/api/auth';

interface OTPInputPageProps {
  method: 'email' | 'phone';
  email: string;
  phone: string;
  onBack: () => void;
  onVerified: () => void;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - 3, 0))}@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 3) + '*'.repeat(phone.length - 6) + phone.slice(-3);
}

export default function OTPInputPage({ method, email, phone, onBack, onVerified }: OTPInputPageProps) {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes = backend OTP expiry
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
      setError('');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = code.join('');

    if (enteredCode.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await verifyActivationApi(email, enteredCode);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setError(res.message || 'Invalid OTP code.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      const smsMethod = method === 'phone' ? 'sms' : 'email';
      await resendOtpApi(email, 'activation', smsMethod);
      setTimeLeft(600);
      setCode(Array(6).fill(''));
      setSuccess(false);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const contact = method === 'email' ? maskEmail(email) : maskPhone(phone);

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transform transition-all">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ArrowLeft size={16} /> Choose another method
      </button>

      {/* Security Shield Illustration */}
      <div className="relative w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
        <ShieldCheck className="w-12 h-12 text-orange-500 z-10" />
        <Settings className="w-6 h-6 text-blue-200 absolute top-2 right-2 animate-spin-slow" />
        <Settings className="w-5 h-5 text-blue-300 absolute bottom-2 left-2 animate-spin-reverse" />
        <div className="absolute -bottom-2 flex space-x-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 tracking-wide uppercase">OTP VERIFICATION</h2>
        <p className="text-gray-500 mt-3 text-sm leading-relaxed">
          Please enter the code we sent to your {method === 'email' ? 'email' : 'phone'} <span className="font-semibold text-gray-700">{contact}</span>. The code is valid for <span className="font-semibold text-gray-700">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`w-12 h-14 text-center text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${success ? 'border-green-500 bg-green-50 text-green-700' : 'text-gray-800'}`}
              autoFocus={index === 0}
              disabled={success || loading}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center font-medium animate-pulse">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-500 text-sm text-center font-medium">
            Verification successful! Redirecting...
          </p>
        )}

        <button
          type="submit"
          disabled={code.join('').length < 6 || success || loading}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verifying...' : 'Confirm'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        Didn't receive the code?{' '}
        {timeLeft > 0 ? (
          <button
            onClick={handleResend}
            className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
          >
            Resend
          </button>
        ) : (
          <button
            onClick={handleResend}
            className="text-orange-600 hover:text-orange-800 font-semibold hover:underline transition-colors"
          >
            Resend new code
          </button>
        )}
      </div>
    </div>
  );
}
