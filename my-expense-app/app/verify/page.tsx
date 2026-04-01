import React from 'react';
import OTPVerificationFlow from '@/components/auth/OTPVerificationFlow';

export const metadata = {
  title: 'Verify Account - ExpenseMate',
  description: 'ExpenseMate Account Verification',
};

export default function VerifyPage() {
  return (
    <main>
      <OTPVerificationFlow />
    </main>
  );
}
