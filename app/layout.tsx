import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'QR Menu for Cafe',
  description:
    'Мобільне QR-меню для кафе: перегляд меню, замовлення зі столика, кабінет власника.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="uk">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
