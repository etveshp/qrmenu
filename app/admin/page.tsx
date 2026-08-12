'use client';

import { QRMenuProvider } from '../../lib/store';
import AppHeader from '../../components/AppHeader';
import AppFooter from '../../components/AppFooter';
import OwnerCabinet from '../../components/OwnerCabinet';

// /admin — the owner entry point: shows the login form when there is no
// session, then the full cabinet.
export default function AdminPage() {
  return (
    <QRMenuProvider>
      <div
        id="app-root-wrapper"
        className="min-h-screen bg-stone-100/40 text-stone-800 antialiased flex flex-col font-sans"
      >
        <AppHeader />
        <main
          id="admin-viewport"
          className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-start"
        >
          <OwnerCabinet />
        </main>
        <AppFooter />
      </div>
    </QRMenuProvider>
  );
}
