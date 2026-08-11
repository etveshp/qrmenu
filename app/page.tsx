'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { QRMenuProvider, useQRMenu } from '../lib/store';
import LanguageSwitcher from '../components/LanguageSwitcher';
import CustomerMenu from '../components/CustomerMenu';
import OwnerCabinet from '../components/OwnerCabinet';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Sliders, Globe } from 'lucide-react';

function MainAppContent() {
  const { t } = useQRMenu();
  const [view, setView] = useState<'guest' | 'owner'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('table')) {
        return 'guest';
      }
    }
    return 'guest';
  });

  return (
    <div id="app-root-wrapper" className="min-h-screen bg-stone-100/40 text-stone-800 antialiased flex flex-col font-sans">
      
      {/* Top utility bar */}
      <div id="top-utility-bar" className="sticky top-0 w-full bg-white/95 backdrop-blur-md border-b border-stone-200/50 py-2.5 px-4 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm">
            🍳
          </div>
          <span className="font-extrabold text-stone-900 tracking-tight text-xs sm:text-sm">
            {t('app.name')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Main View Toggle */}
          <div id="view-mode-toggle" className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200/40">
            <button
              id="view-toggle-guest"
              onClick={() => setView('guest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                view === 'guest'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Utensils size={13} />
              <span className="hidden sm:inline">{t('app.menu_btn')}</span>
            </button>
            <button
              id="view-toggle-owner"
              onClick={() => setView('owner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                view === 'owner'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sliders size={13} />
              <span className="hidden sm:inline">{t('app.owner_btn')}</span>
            </button>
          </div>

          <LanguageSwitcher />
        </div>
      </div>

      {/* Main viewport */}
      <main id="app-viewport" className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {view === 'guest' ? (
            <motion.div
              key="guest"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full flex justify-center"
            >
              <CustomerMenu />
            </motion.div>
          ) : (
            <motion.div
              key="owner"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <OwnerCabinet />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer info */}
      <footer id="app-footer" className="w-full bg-white border-t border-stone-200/50 py-4 px-6 text-center text-[11px] text-stone-400 font-medium">
        <p>© 2026 {t('app.name')}. {t('common.rights_reserved')}</p>
        <p className="mt-1 text-stone-300">{t('app.made_with')}</p>
      </footer>
    </div>
  );
}

// Wrapping in Suspense because of useSearchParams (mandatory in Next.js App Router inside client components)
export default function MainPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Завантаження...</p>
      </div>
    }>
      <QRMenuProvider>
        <MainAppContent />
      </QRMenuProvider>
    </Suspense>
  );
}
