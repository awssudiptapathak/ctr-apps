import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Belgharia Club Town Cultural Association',
  description: 'Belgharia Club Town Cultural Association management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
