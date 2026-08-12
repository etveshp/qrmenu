'use client';

import { QRMenuProvider } from '../lib/store';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import CustomerMenu from '../components/CustomerMenu';

export default function MainPage() {
  return (
    <QRMenuProvider>
      <div
        id="app-root-wrapper"
        className="min-h-screen bg-stone-100/40 text-stone-800 antialiased flex flex-col font-sans"
      >
        <AppHeader />
        <main
          id="app-viewport"
          className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-start"
        >
          <div className="w-full flex justify-center">
            <CustomerMenu />
          </div>
        </main>
        <AppFooter />
      </div>
    </QRMenuProvider>
  );
}
