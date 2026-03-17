import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Real Food Map — Bangalore',
  description: 'Trust-based food discovery and social platform for Bangalore. Find the best street food, mess, chai, and more — ranked by real people.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'rfm.',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'Real Food Map — Bangalore',
    description: 'Trust-based food discovery platform for Bangalore.',
    siteName: 'rfm.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#E8611A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-dark antialiased">
        <div className="screen">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
