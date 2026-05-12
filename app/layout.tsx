import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KYC Tier Decisioning — Shift Atlas',
  description: 'Three-pass reasoning pipeline demo for Philippine bank compliance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
