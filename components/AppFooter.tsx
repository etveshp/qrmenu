'use client';

import { useQRMenu } from '../lib/store';

export default function AppFooter() {
  const { t } = useQRMenu();
  return (
    <footer
      id="app-footer"
      className="w-full bg-white border-t border-stone-200/50 py-4 px-6 text-center text-xs text-stone-400 font-medium"
    >
      <p>
        © 2026 {t('app.name')}. {t('common.rights_reserved')}
      </p>
      <p className="mt-1 text-stone-300">{t('app.made_with')}</p>
    </footer>
  );
}
