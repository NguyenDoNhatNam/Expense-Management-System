'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/AppContext';
import OTPMethodSelection from './OTPMethodSelection';
import OTPInputPage from './OTPInputPage';

export default function OTPVerificationFlow() {
  const { pendingVerification, clearPendingVerification } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone'>('email');

  // If no pending verification data, show message and redirect
  if (!pendingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 py-12 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">No verification request</h2>
          <p className="text-gray-500 mb-6">Please register or log in first.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  const handleSelectMethod = (method: 'email' | 'phone') => {
    setSelectedMethod(method);
    setStep(2);
  };

  const handleVerified = () => {
    clearPendingVerification();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full flex justify-center">
        {step === 1 ? (
          <OTPMethodSelection
            email={pendingVerification.email}
            phone={pendingVerification.phone}
            onSelectMethod={handleSelectMethod}
          />
        ) : (
          <OTPInputPage
            method={selectedMethod}
            email={pendingVerification.email}
            phone={pendingVerification.phone}
            onBack={() => setStep(1)}
            onVerified={handleVerified}
          />
        )}
      </div>
    </div>
  );
}
