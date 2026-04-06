import './globals.css';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { SessionProvider } from 'next-auth/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Skeleton - Auth Starter',
  description: 'A Next.js 14 authentication starter template',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const saved = localStorage.getItem('skeleton_theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              let theme = 'light';
              if (saved === 'light' || saved === 'dark-standard' || saved === 'dark-red' || saved === 'dark-emerald') {
                theme = saved;
              } else if (saved === 'dark') {
                theme = 'dark-standard';
              } else if (saved === 'system' || !saved) {
                theme = prefersDark ? 'dark-standard' : 'light';
              }
              document.documentElement.setAttribute('data-theme', theme);
            } catch {
              document.documentElement.setAttribute('data-theme', 'light');
            }
          })();`}
        </Script>
        <SessionProvider>
          <ThemeProvider>
            <SettingsProvider>
              {children}
            </SettingsProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
