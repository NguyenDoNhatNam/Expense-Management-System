'use client';

import React, { useState } from 'react';
import OTPMethodSelection from './OTPMethodSelection';
import OTPInputPage from './OTPInputPage';

export default function OTPVerificationFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [contact, setContact] = useState<string>('');

  const handleSelectMethod = (selectedMethod: 'email' | 'phone', selectedContact: string) => {
    setMethod(selectedMethod);
    setContact(selectedContact);
    setStep(2);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full flex justify-center">
        {step === 1 ? (
          <OTPMethodSelection onSelectMethod={handleSelectMethod} />
        ) : (
          <OTPInputPage method={method!} contact={contact} />
        )}
      </div>
    </div>
  );
}
