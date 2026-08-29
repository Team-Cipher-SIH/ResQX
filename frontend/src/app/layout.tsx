import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResQtech | Smart Disaster Management System',
  description: 'A unified disaster management platform connecting citizens and authorities for real-time reporting, situational awareness, and emergency response.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light scroll-smooth">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
