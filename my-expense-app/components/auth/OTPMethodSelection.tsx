import React, { useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { resendOtpApi, getApiErrorMessage } from '@/lib/api/auth';

interface OTPMethodSelectionProps {
  email: string;
  phone: string;
  onSelectMethod: (method: 'email' | 'phone') => void;
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

export default function OTPMethodSelection({ email, phone, onSelectMethod }: OTPMethodSelectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (method: 'email' | 'phone') => {
    setSelectedMethod(method);
    setLoading(true);
    setError('');

    try {
      if (method === 'phone') {
        // SMS method → call resend-otp with method=sms to send new OTP via SMS
        await resendOtpApi(email, 'activation', 'sms');
      }
      // Email OTP is already sent during registration, no need to resend.
      // But if user picks email again, it's fine — they already have the code.
      setTimeout(() => {
        onSelectMethod(method);
      }, 300);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSelectedMethod(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transform transition-all">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Verification</h2>
        <p className="text-gray-500">
          Choose a method to receive your OTP verification code.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Email Option */}
        <button
          onClick={() => handleSelect('email')}
          disabled={loading}
          className={`w-full flex items-center p-4 border rounded-xl transition-all duration-200 group hover:scale-[1.02] hover:shadow-md disabled:opacity-50 ${
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
            <p className="text-sm text-gray-500">{maskEmail(email)}</p>
          </div>
        </button>

        {/* Phone Option */}
        <button
          onClick={() => handleSelect('phone')}
          disabled={loading}
          className={`w-full flex items-center p-4 border rounded-xl transition-all duration-200 group hover:scale-[1.02] hover:shadow-md disabled:opacity-50 ${
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
            <p className="text-sm text-gray-500">{maskPhone(phone)}</p>
          </div>
        </button>
      </div>

      {loading && (
        <p className="text-sm text-center text-gray-400 mt-4">Sending OTP code...</p>
      )}
    </div>
  );
}
