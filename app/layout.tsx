import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Montu. Stop scrolling. Start playing.',
  description: 'Tell us what you want to play. We find your squad, set the game night, and text you when it is time to play.',
  applicationName: 'Montu',
};

export const viewport: Viewport = {
  themeColor: '#0b0714',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <div className="montu-shell min-h-screen">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
