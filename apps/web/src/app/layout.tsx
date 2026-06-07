import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'SmartDeck Pro — Command Center',
  description: 'Manage profiles, macros, actions, and custom triggers for your SmartDeck touchscreen hardware.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen text-gray-100 bg-background overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
