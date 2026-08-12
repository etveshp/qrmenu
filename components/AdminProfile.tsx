'use client';

import React, { useState } from 'react';
import { useQRMenu } from '../lib/store';
import { motion } from 'motion/react';
import { KeyRound, AlertCircle, ChevronLeft, UserRound, Check } from 'lucide-react';

// Admin profile page: account info + change password (moved from the
// owner cabinet modal). Gated: without an owner session it offers sign-in.
export default function AdminProfile({ onBack }: { onBack: () => void }) {
  const { t, isOwner, ownerEmail, changePassword } = useQRMenu();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdStatus(null);
    if (newPassword.length < 6) {
      setPwdStatus({ type: 'error', text: t('dashboard.password_short') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdStatus({ type: 'error', text: t('dashboard.passwords_dont_match') });
      return;
    }
    const { error } = await changePassword(newPassword);
    if (error) {
      console.error('Change password failed', error);
      setPwdStatus({ type: 'error', text: t('dashboard.password_change_error') });
      return;
    }
    setPwdStatus({ type: 'success', text: t('dashboard.password_changed') });
    setNewPassword('');
    setConfirmPassword('');
  };

  if (!isOwner) {
    return (
      <div id="admin-profile-login-prompt" className="w-full max-w-md mx-auto bg-stone-50 min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
          <UserRound size={24} />
        </div>
        <p className="text-stone-500 text-sm font-semibold text-center max-w-xs">{t('profile.need_login')}</p>
        <button
          id="profile-go-login-btn"
          type="button"
          onClick={onBack}
          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
        >
          {t('profile.go_login')}
        </button>
      </div>
    );
  }

  return (
    <div id="admin-profile-page" className="w-full max-w-md mx-auto bg-stone-50 min-h-screen p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          id="profile-back-btn"
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-stone-200/60 shadow-sm text-stone-700 hover:bg-stone-100 text-xs font-bold transition-all active:scale-95"
        >
          <ChevronLeft size={16} />
          {t('profile.back')}
        </button>
        <h1 className="text-sm font-extrabold text-stone-800 flex items-center gap-1.5">
          <KeyRound size={16} className="text-amber-600" />
          {t('profile.title')}
        </h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <UserRound size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">{t('profile.email')}</span>
            <span className="text-sm font-extrabold text-stone-900 break-all">{ownerEmail}</span>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="new-password-field" className="text-xs font-bold text-stone-500">
              {t('dashboard.new_password')}
            </label>
            <input
              id="new-password-field"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-stone-50 px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              minLength={6}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm-password-field" className="text-xs font-bold text-stone-500">
              {t('dashboard.confirm_password')}
            </label>
            <input
              id="confirm-password-field"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-stone-50 px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
              minLength={6}
            />
          </div>

          {pwdStatus && (
            <div
              id="change-password-status"
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                pwdStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                  : 'bg-rose-50 border border-rose-100 text-rose-600'
              }`}
            >
              {pwdStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{pwdStatus.text}</span>
            </div>
          )}

          <button
            id="submit-change-password-btn"
            type="submit"
            className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            <KeyRound size={14} />
            {t('dashboard.change_password')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
