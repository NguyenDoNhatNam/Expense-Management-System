'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OTPInputPageProps {
  method: 'email' | 'phone';
  contact: string;
}

export default function OTPInputPage({ method, contact }: OTPInputPageProps) {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize input refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    // Only accept numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only keep the last digit if pasted
    setCode(newCode);
    setError('');

    // Advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // If empty, move to previous and clear it
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Just clear current
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
    
    // Focus next empty or the last input
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = code.join('');
    
    if (enteredCode.length < 6) {
      setError('Incorrect OTP. Please check the code or click Resend.');
      return;
    }

    // Mock validation logic
    if (enteredCode === '123456') { // Mock correct code
      const unverified = JSON.parse(localStorage.getItem('unverified_emails') || '[]');
      const filtered = unverified.filter((e: string) => e !== contact);
      localStorage.setItem('unverified_emails', JSON.stringify(filtered));

      setSuccess(true);
      setError('');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else {
      setError('Incorrect OTP. Please check the code or click Resend.');
    }
  };

  const handleResend = () => {
    setTimeLeft(120);
    setCode(Array(6).fill(''));
    setError('');
    setSuccess(false);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transform transition-all">
      {/* Security Shield Illustration */}
      <div className="relative w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
        <ShieldCheck className="w-12 h-12 text-orange-500 z-10" />
        <Settings className="w-6 h-6 text-blue-200 absolute top-2 right-2 animate-spin-slow" />
        <Settings className="w-5 h-5 text-blue-300 absolute bottom-2 left-2 animate-spin-reverse" />
        {/* Decorative dots to simulate the image */}
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
          Please enter the code we sent to your {method === 'email' ? 'email' : 'phone'} at <span className="font-semibold text-gray-700">{contact}</span>. The code is valid for <span className="font-semibold text-gray-700">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>s.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                 inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`w-12 h-14 text-center text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${success ? 'border-green-500 bg-green-50 text-green-700' : 'text-gray-800'}`}
              autoFocus={index === 0}
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
            Verification Successful. Redirecting...
          </p>
        )}

        <button
          type="submit"
          disabled={code.join('').length < 6 || success}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        Didn't receive the code?{' '}
        <button
          onClick={handleResend}
          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
        >
          Resend
        </button>
      </div>
    </div>
  );
}
