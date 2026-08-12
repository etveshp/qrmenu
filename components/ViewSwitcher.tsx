'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQRMenu } from '../lib/store';
import { motion } from 'motion/react';
import { Utensils, Sliders } from 'lucide-react';

// Collapsed circle that expands into a vertical capsule — same pattern as the
// language switcher, but in a dark (stone) accent. Switches between the guest
// menu (/) and the admin cabinet (/admin). Visible only for the owner.
export default function ViewSwitcher() {
  const { t } = useQRMenu();
  const router = useRouter();
  const pathname = usePathname();
  const isOwnerView = pathname?.startsWith('/admin') ?? false;

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

  const options: { key: 'guest' | 'owner'; icon: React.ReactNode; title: string }[] = [
    { key: 'guest', icon: <Utensils size={15} />, title: t('app.menu_btn') },
    { key: 'owner', icon: <Sliders size={15} />, title: t('app.owner_btn') },
  ];

  const current = isOwnerView ? options[1] : options[0];

  const navigate = (key: 'guest' | 'owner') => {
    setIsOpen(false);
    router.push(key === 'owner' ? '/admin' : '/');
  };

  return (
    <div
      ref={containerRef}
      id="view-switcher-wrapper"
      className="relative w-10 h-10 select-none z-50"
    >
      <motion.div
        layout
        id="view-switcher-container"
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className={`absolute right-0 top-0 flex flex-col items-center overflow-hidden rounded-full ${
          isOpen
            ? 'w-10 py-1 gap-1 bg-white/95 backdrop-blur-md border border-stone-200/80 shadow-lg'
            : 'w-10 h-10 justify-center bg-transparent border-transparent'
        }`}
      >
        {!isOpen ? (
          // Collapsed state: dark circle with the current view's icon
          <button
            id="view-collapsed-btn"
            type="button"
            onClick={() => setIsOpen(true)}
            title={current.title}
            className="w-10 h-10 rounded-full bg-stone-800 hover:bg-stone-900 transition-colors flex items-center justify-center text-white shadow-[0_2px_8px_rgba(41,37,36,0.35)]"
          >
            {current.icon}
          </button>
        ) : (
          // Expanded state: vertical capsule with both options
          <div id="view-expanded-list" className="flex flex-col items-center gap-1 w-full">
            {options.map((opt) => {
              const isActive = (opt.key === 'owner') === isOwnerView;
              return (
                <button
                  key={opt.key}
                  id={`view-option-${opt.key}`}
                  type="button"
                  title={opt.title}
                  onClick={() => navigate(opt.key)}
                  className="relative w-8 h-8 flex items-center justify-center transition-colors duration-200 cursor-pointer rounded-full"
                >
                  {isActive && (
                    <motion.div
                      layoutId="viewActiveCircle"
                      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                      className="absolute inset-0 bg-stone-800 rounded-full z-0 shadow-[0_1px_4px_rgba(41,37,36,0.3)]"
                    />
                  )}
                  <span
                    className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-stone-600 hover:text-stone-900'}`}
                  >
                    {opt.icon}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
