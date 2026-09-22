import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Monitoring Pekerjaan & Deadline Instansi',
  description: 'Aplikasi Manajemen Beban Kerja dan Deadline Berjenjang',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
