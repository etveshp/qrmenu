'use client';

import { useRouter } from 'next/navigation';
import { useQRMenu } from '../lib/store';
import ViewSwitcher from './ViewSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import MoreMenu from './MoreMenu';

// Top utility bar shared by the guest page, the /admin cabinet and the
// admin profile. Admin-only controls (view switcher, kebab menu) render
// only for the owner; guests see just the language switcher.
export default function AppHeader() {
  const { t, isOwner, cafeLogoUrl } = useQRMenu();
  const router = useRouter();

  return (
    <div
      id="top-utility-bar"
      className="sticky top-0 w-full bg-white/95 backdrop-blur-md border-b border-stone-200/50 py-2.5 px-4 flex items-center justify-between shadow-sm z-30"
    >
      {/* Logo doubles as the entry to the admin cabinet (/admin) */}
      <button
        id="app-logo-btn"
        type="button"
        onClick={() => router.push('/admin')}
        title={t('app.owner_btn')}
        className="flex items-center gap-2 cursor-pointer"
      >
        {cafeLogoUrl ? (
          <img src={cafeLogoUrl} alt={t('app.name')} className="w-8 h-8 object-contain" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
            🍳
          </div>
        )}
        <span className="font-extrabold text-stone-900 tracking-tight text-xs sm:text-sm">
          {t('app.name')}
        </span>
      </button>

      <div className="flex items-center gap-3">
        {isOwner && <ViewSwitcher />}
        <LanguageSwitcher />
        {isOwner && <MoreMenu onOpenProfile={() => router.push('/admin/profile')} />}
      </div>
    </div>
  );
}
