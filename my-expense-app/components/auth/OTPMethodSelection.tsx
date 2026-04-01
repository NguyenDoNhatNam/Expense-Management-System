import React, { useState } from 'react';
import { Mail, Phone } from 'lucide-react';

interface OTPMethodSelectionProps {
  onSelectMethod: (method: 'email' | 'phone', contact: string) => void;
}

export default function OTPMethodSelection({ onSelectMethod }: OTPMethodSelectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone' | null>(null);

  const handleSelect = (method: 'email' | 'phone', contact: string) => {
    setSelectedMethod(method);
    // Add a slight delay for user to see the selection effect before transitioning
    setTimeout(() => {
      onSelectMethod(method, contact);
    }, 300);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transform transition-all">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Account</h2>
        <p className="text-gray-500">
          Please choose a method to receive your security code.
        </p>
      </div>

      <div className="space-y-4">
        {/* Email Option */}
        <button
          onClick={() => handleSelect('email', '****yenquoc260293@gmail.com')}
          className={`w-full flex items-center p-4 border rounded-xl transition-all duration-200 group hover:scale-[1.02] hover:shadow-md ${
            selectedMethod === 'email'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-500 bg-white'
          }`}
        >
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
            <Mail size={24} />
          </div>
          <div className="ml-4 text-left">
            <h3 className="text-md font-semibold text-gray-800">Send via Email</h3>
            <p className="text-sm text-gray-500">****yenquoc260293@gmail.com</p>
          </div>
        </button>

        {/* Phone Option */}
        <button
          onClick={() => handleSelect('phone', '090****567')}
          className={`w-full flex items-center p-4 border rounded-xl transition-all duration-200 group hover:scale-[1.02] hover:shadow-md ${
            selectedMethod === 'phone'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-500 bg-white'
          }`}
        >
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
            <Phone size={24} />
          </div>
          <div className="ml-4 text-left">
            <h3 className="text-md font-semibold text-gray-800">Send via SMS</h3>
            <p className="text-sm text-gray-500">090****567</p>
          </div>
        </button>
      </div>
    </div>
  );
}
