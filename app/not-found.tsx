'use client';

import Link from 'next/link';
import { QRMenuProvider, useQRMenu } from '../lib/store';

function NotFoundContent() {
  const { t } = useQRMenu();
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-stone-200/50">
        <span className="text-4xl">🔍</span>
        <h1 className="text-2xl font-black text-stone-900 mt-4 mb-2">{t('nf.title')}</h1>
        <p className="text-stone-500 text-sm mb-6">{t('nf.text')}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          {t('nf.home')}
        </Link>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <QRMenuProvider>
      <NotFoundContent />
    </QRMenuProvider>
  );
}
