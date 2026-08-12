'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQRMenu } from '../lib/store';
import { motion } from 'motion/react';
import { MoreVertical, Volume2, VolumeX, UserRound, LogOut } from 'lucide-react';

// Round kebab menu in the header — same capsule pattern as the language and
// view switchers. Contains: sound toggle, admin profile, sign out (bottom).
export default function MoreMenu({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { t, soundEnabled, setSoundEnabled, signOut } = useQRMenu();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSound = () => {
    setSoundEnabled(!soundEnabled);
    setIsOpen(false);
  };

  const handleProfile = () => {
    setIsOpen(false);
    onOpenProfile();
  };

  const handleLogout = () => {
    setIsOpen(false);
    signOut().catch((err) => console.error('Logout failed', err));
  };

  return (
    <div ref={containerRef} id="more-menu-wrapper" className="relative w-10 h-10 select-none z-50">
      <motion.div
        layout
        id="more-menu-container"
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`absolute right-0 top-0 flex flex-col items-center overflow-hidden rounded-full ${
          isOpen
            ? 'w-10 py-1 gap-0.5 bg-white/95 backdrop-blur-md border border-stone-200/80 shadow-lg'
            : 'w-10 h-10 justify-center bg-transparent border-transparent'
        }`}
      >
        {!isOpen ? (
          // Collapsed state: medium-gray circle with the kebab icon
          <button
            id="more-collapsed-btn"
            type="button"
            onClick={() => setIsOpen(true)}
            title={t('header.more')}
            className="w-10 h-10 rounded-full bg-stone-600 hover:bg-stone-700 transition-colors flex items-center justify-center text-white shadow-[0_2px_8px_rgba(87,83,78,0.35)]"
          >
            <MoreVertical size={17} />
          </button>
        ) : (
          // Expanded state: vertical capsule — kebab icon stays on top,
          // then sound toggle, profile and sign-out below it
          <div id="more-expanded-list" className="flex flex-col items-center gap-0.5 w-full">
            <div
              className="w-8 h-8 flex items-center justify-center text-stone-500"
              title={t('header.more')}
            >
              <MoreVertical size={16} />
            </div>

            <button
              id="more-sound-btn"
              type="button"
              title={soundEnabled ? t('orders.sound_on') : t('orders.sound_off')}
              onClick={handleSound}
              className={`w-8 h-8 flex items-center justify-center transition-colors duration-200 cursor-pointer rounded-full ${
                soundEnabled ? 'text-amber-600' : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              id="more-profile-btn"
              type="button"
              title={t('header.profile')}
              onClick={handleProfile}
              className="w-8 h-8 flex items-center justify-center transition-colors duration-200 cursor-pointer rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            >
              <UserRound size={15} />
            </button>

            {/* Separator before sign out */}
            <div className="w-6 h-px bg-stone-200 my-0.5" />

            <button
              id="more-logout-btn"
              type="button"
              title={t('dashboard.logout')}
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center transition-colors duration-200 cursor-pointer rounded-full text-stone-600 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
