'use client';

import { useRouter } from 'next/navigation';
import { QRMenuProvider } from '../../../lib/store';
import AppHeader from '../../../components/AppHeader';
import AppFooter from '../../../components/AppFooter';
import AdminProfile from '../../../components/AdminProfile';

function ProfileContent() {
  const router = useRouter();
  return <AdminProfile onBack={() => router.push('/admin')} />;
}

// /admin/profile — account info + change password.
export default function AdminProfilePage() {
  return (
    <QRMenuProvider>
      <div
        id="app-root-wrapper"
        className="min-h-screen bg-stone-100/40 text-stone-800 antialiased flex flex-col font-sans"
      >
        <AppHeader />
        <main
          id="admin-profile-viewport"
          className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-start"
        >
          <ProfileContent />
        </main>
        <AppFooter />
      </div>
    </QRMenuProvider>
  );
}
