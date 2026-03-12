import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'SQLens - Interactive SQL Query Visualizer',
  description: 'An open-source, web-based interactive SQL query visualizer for computer science students and professors. Visualize query execution plans, step through operations, and understand how SQL works.',
  keywords: ['SQL', 'query visualizer', 'database', 'education', 'relational algebra', 'query plan'],
  authors: [{ name: 'SQLens Team' }],
  openGraph: {
    title: 'SQLens - Interactive SQL Query Visualizer',
    description: 'Visualize and understand SQL queries step by step',
    type: 'website',
  },
};

// Script to set theme before React hydrates to prevent flash
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('sqlens-ui-storage');
      var theme = stored ? JSON.parse(stored).state?.theme : 'dark';
      document.documentElement.classList.add(theme === 'light' ? 'light' : 'dark');
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
