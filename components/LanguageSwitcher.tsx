'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQRMenu } from '../lib/store';
import { motion } from 'motion/react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useQRMenu();
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

  const languages: ('ua' | 'hu' | 'en')[] = ['ua', 'hu', 'en'];

  return (
    <div 
      ref={containerRef} 
      id="lang-switcher-wrapper" 
      className="relative w-10 h-10 select-none z-50"
    >
      <motion.div
        layout
        id="lang-switcher-container"
        transition={{ 
          type: "spring", 
          stiffness: 350, 
          damping: 25 
        }}
        className={`absolute right-0 top-0 flex flex-col items-center overflow-hidden rounded-full ${
          isOpen 
            ? "w-10 py-1 gap-1 bg-white/95 backdrop-blur-md border border-stone-200/80 shadow-lg" 
            : "w-10 h-10 justify-center bg-transparent border-transparent"
        }`}
      >
        {!isOpen ? (
          // Collapsed state: Simple orange circle with active language
          <button
            id="lang-collapsed-btn"
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center text-white text-[11px] font-black uppercase font-sans tracking-wide cursor-pointer shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
          >
            {language === 'ua' ? 'UA' : language === 'hu' ? 'HU' : 'EN'}
          </button>
        ) : (
          // Expanded state: Maximally rounded vertical rectangle (capsule) with light background
          <div id="lang-expanded-list" className="flex flex-col items-center gap-1 w-full">
            {languages.map((lang) => {
              const isActive = language === lang;
              return (
                <button
                  key={lang}
                  id={`lang-option-${lang}`}
                  type="button"
                  onClick={() => {
                    setLanguage(lang);
                    setIsOpen(false);
                  }}
                  className="relative w-8 h-8 flex items-center justify-center text-[10px] font-extrabold uppercase font-sans tracking-wide transition-colors duration-200 cursor-pointer rounded-full"
                >
                  {/* Orange active indicator circle inside the capsule */}
                  {isActive && (
                    <motion.div
                      layoutId="activeCircle"
                      transition={{ 
                        type: "spring", 
                        stiffness: 380, 
                        damping: 24 
                      }}
                      className="absolute inset-0 bg-amber-500 rounded-full z-0 shadow-[0_1px_4px_rgba(245,158,11,0.3)]"
                    />
                  )}
                  <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-stone-600 hover:text-stone-900'}`}>
                    {lang === 'ua' ? 'UA' : lang === 'hu' ? 'HU' : 'EN'}
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
