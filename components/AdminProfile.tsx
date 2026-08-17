'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQRMenu } from '../lib/store';
import { compressImage } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, AlertCircle, ChevronLeft, UserRound, Check, Camera, Upload, Trash2, X, ZoomIn, ZoomOut, RotateCcw, Clock } from 'lucide-react';

// Working hours: one row per day, stored as 'HH:MM - HH:MM' ('' = closed)
const HOUR_DAYS: { key: string; labelKey: string }[] = [
  { key: 'mon', labelKey: 'profile.day_mon' },
  { key: 'tue', labelKey: 'profile.day_tue' },
  { key: 'wed', labelKey: 'profile.day_wed' },
  { key: 'thu', labelKey: 'profile.day_thu' },
  { key: 'fri', labelKey: 'profile.day_fri' },
  { key: 'sat', labelKey: 'profile.day_sat' },
  { key: 'sun', labelKey: 'profile.day_sun' },
];

// Admin profile page: account info + change password (moved from the
// owner cabinet modal). Gated: without an owner session it offers sign-in.
export default function AdminProfile({ onBack }: { onBack: () => void }) {
  const { t, isOwner, ownerEmail, changePassword, cafePhotoUrl, cafeLogoUrl, cafeNames, cafeDescriptions, cafeHours, uploadCafePhoto, uploadCafeLogo, saveCafeInfo, deleteCafePhoto } = useQRMenu();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [photoStatus, setPhotoStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [cafeNamesInput, setCafeNamesInput] = useState<{ ua: string; en: string; hu: string }>(cafeNames);
  const [cafeDescriptionsInput, setCafeDescriptionsInput] = useState<{ ua: string; en: string; hu: string }>(cafeDescriptions);
  const [cafeLang, setCafeLang] = useState<'ua' | 'en' | 'hu'>('ua');
  const [infoStatus, setInfoStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Photo crop: pending file + zoom/pan state
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; url: string } | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const cropViewportRef = useRef<HTMLDivElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [logoStatus, setLogoStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [hoursForm, setHoursForm] = useState<Record<string, { open: string; close: string }>>(() =>
    Object.fromEntries(HOUR_DAYS.map((d) => [d.key, { open: '', close: '' }]))
  );
  const [hoursStatus, setHoursStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Sync the form when stored hours finish loading
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoursForm(
      Object.fromEntries(
        HOUR_DAYS.map((d) => {
          const [open = '', close = ''] = (cafeHours[d.key] || '').split(' - ');
          return [d.key, { open, close }];
        })
      )
    );
  }, [cafeHours]);

  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setHoursStatus(null);
    const hours: Record<string, string> = {};
    for (const d of HOUR_DAYS) {
      const { open, close } = hoursForm[d.key];
      hours[d.key] = open && close ? `${open} - ${close}` : '';
    }
    try {
      await saveCafeInfo({ hours });
      setHoursStatus({ type: 'success', text: t('profile.info_saved') });
    } catch (err) {
      console.error('Failed to save working hours', err);
      setHoursStatus({ type: 'error', text: t('common.save_error') });
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = file.type === 'image/png' || file.type === 'image/svg+xml';
    if (!ok) {
      setLogoStatus({ type: 'error', text: t('profile.logo_invalid') });
      return;
    }
    setLogoStatus(null);
    setIsLogoUploading(true);
    try {
      // Downscale/re-encode raster logos (PNG) before they hit the bucket;
      // SVG stays untouched (vector).
      const ready = await compressImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.9 });
      await uploadCafeLogo(ready);
      setLogoStatus({ type: 'success', text: t('profile.logo_uploaded') });
    } catch (err) {
      console.error('Failed to upload cafe logo', err);
      setLogoStatus({ type: 'error', text: t('profile.upload_error') });
    } finally {
      setIsLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Sync inputs when the stored café info finishes loading
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCafeNamesInput(cafeNames);
  }, [cafeNames]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCafeDescriptionsInput(cafeDescriptions);
  }, [cafeDescriptions]);

  const handleDeletePhoto = async () => {
    setPhotoStatus(null);
    try {
      await deleteCafePhoto();
      setPhotoStatus({ type: 'success', text: t('profile.photo_deleted') });
    } catch (err) {
      console.error('Failed to delete cafe photo', err);
      setPhotoStatus({ type: 'error', text: t('profile.delete_photo_error') });
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoStatus(null);
    try {
      await saveCafeInfo({
        name_ua: cafeNamesInput.ua.trim(),
        name_en: cafeNamesInput.en.trim(),
        name_hu: cafeNamesInput.hu.trim(),
        description_ua: cafeDescriptionsInput.ua.trim(),
        description_en: cafeDescriptionsInput.en.trim(),
        description_hu: cafeDescriptionsInput.hu.trim(),
      });
      setInfoStatus({ type: 'success', text: t('profile.info_saved') });
    } catch (err) {
      console.error('Failed to save cafe info', err);
      setInfoStatus({ type: 'error', text: t('common.save_error') });
    }
  };

  // Image opened -> compute the fit-cover baseline (min zoom) and reset pan
  const initCrop = () => {
    const viewport = cropViewportRef.current;
    const img = cropImageRef.current;
    if (!viewport || !img || !img.naturalWidth || !img.naturalHeight) return;
    const base = Math.max(
      viewport.clientWidth / img.naturalWidth,
      viewport.clientHeight / img.naturalHeight
    );
    if (!Number.isFinite(base) || base <= 0) return; // keep last good scale
    setMinScale(base);
    setCropScale(base);
    setCropPan({ x: 0, y: 0 });
  };

  // Also (re)fit when the dialog mounts — covers cached images whose onLoad
  // may have fired before the refs/viewport were ready.
  useEffect(() => {
    if (pendingPhoto) initCrop();
  }, [pendingPhoto]);

  // Keep the image covering the viewport (no empty areas)
  const clampPan = (pan: { x: number; y: number }, scale: number) => {
    const viewport = cropViewportRef.current;
    const img = cropImageRef.current;
    if (!viewport || !img) return pan;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const mx = Math.max(0, (dw - viewport.clientWidth) / 2);
    const my = Math.max(0, (dh - viewport.clientHeight) / 2);
    return {
      x: Math.min(mx, Math.max(-mx, pan.x)),
      y: Math.min(my, Math.max(-my, pan.y)),
    };
  };

  const changeZoom = (next: number) => {
    const clamped = Math.min(Math.max(next, minScale), minScale * 4);
    setCropScale(clamped);
    setCropPan((prev) => clampPan(prev, clamped));
  };

  const onCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: cropPan.x, panY: cropPan.y };
  };

  const onCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setCropPan(clampPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy }, cropScale));
  };

  const onCropPointerUp = () => {
    dragRef.current = null;
  };

  const cancelCrop = () => {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.url);
    setPendingPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const applyCrop = () => {
    const img = cropImageRef.current;
    const viewport = cropViewportRef.current;
    if (!img || !viewport || !pendingPhoto) return;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const s = cropScale;
    // Visible source rectangle in the natural image.
    // The image center sits at viewport (vw/2 + pan.x, vh/2 + pan.y), so the
    // viewport's top-left maps to: nw/2 - (vw/2 + pan.x)/s, nh/2 - (vh/2 + pan.y)/s.
    const sx = img.naturalWidth / 2 - (vw / 2 + cropPan.x) / s;
    const sy = img.naturalHeight / 2 - (vh / 2 + cropPan.y) / s;
    const sw = vw / s;
    const sh = vh / s;

    // Render at 2x banner resolution (banner is 448x240) for crisp output
    const outW = 896;
    const outH = 480;
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Flatten transparency onto white first — the banner is an opaque photo
    // (WebP supports alpha, but transparency would look inconsistent there).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

    setIsCropping(true);
    // WebP at ~80% quality: same look as JPEG 85% but roughly a third smaller.
    canvas.toBlob(
      async (blob) => {
        try {
          if (!blob) throw new Error('canvas export failed');
          await uploadCafePhoto(new File([blob], 'cafe.webp', { type: 'image/webp' }));
          setPhotoStatus({ type: 'success', text: t('profile.photo_uploaded') });
          cancelCrop();
        } catch (err) {
          console.error('Failed to upload cafe photo', err);
          setPhotoStatus({ type: 'error', text: t('profile.upload_error') });
        } finally {
          setIsCropping(false);
        }
      },
      'image/webp',
      0.8
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoStatus({ type: 'error', text: t('menu.invalid_file') });
      return;
    }
    setPhotoStatus(null);
    // Open the crop dialog instead of uploading immediately
    setPendingPhoto({ file, url: URL.createObjectURL(file) });
  };

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

      {/* Café photo upload — its own card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-2">
          {/* Café name + description (shown on the menu banner) */}
          <form onSubmit={handleSaveInfo} className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="cafe-name-input" className="text-xs font-bold text-stone-500">
                  {t('profile.cafe_name')}
                </label>
                <div className="flex gap-1">
                  {(['ua', 'en', 'hu'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setCafeLang(l)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-colors ${
                        cafeLang === l ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="cafe-name-input"
                type="text"
                value={cafeNamesInput[cafeLang]}
                onChange={(e) => setCafeNamesInput((prev) => ({ ...prev, [cafeLang]: e.target.value }))}
                className="w-full bg-stone-50 px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="cafe-desc-input" className="text-xs font-bold text-stone-500">
                  {t('profile.cafe_description')}
                </label>
              </div>
              <textarea
                id="cafe-desc-input"
                rows={2}
                value={cafeDescriptionsInput[cafeLang]}
                onChange={(e) => setCafeDescriptionsInput((prev) => ({ ...prev, [cafeLang]: e.target.value }))}
                className="w-full bg-stone-50 px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
            <button
              id="save-cafe-info-btn"
              type="submit"
              className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <Check size={14} />
              {t('profile.save_info')}
            </button>
            {infoStatus && (
              <div
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  infoStatus.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                    : 'bg-rose-50 border border-rose-100 text-rose-600'
                }`}
              >
                {infoStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{infoStatus.text}</span>
              </div>
            )}
          </form>

          <div className="border-t border-stone-100 pt-3" />

          <div className="flex items-center gap-2">
            <Camera size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-stone-700">{t('profile.photo_label')}</span>
          </div>
          <p className="text-[11px] text-stone-400 font-medium">{t('profile.photo_hint')}</p>

          {cafePhotoUrl ? (
            <div className="relative">
              <img
                src={cafePhotoUrl}
                alt={t('profile.photo_label')}
                className="w-full aspect-[28/15] object-cover rounded-xl border border-stone-200/70 shadow-sm"
              />
              <button
                id="delete-cafe-photo-btn"
                type="button"
                onClick={handleDeletePhoto}
                title={t('profile.delete_photo')}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-rose-50 text-stone-500 hover:text-rose-600 rounded-lg shadow border border-stone-200 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div className="w-full aspect-[28/15] rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex items-center justify-center text-stone-400 text-xs font-semibold">
              {t('profile.upload_photo')}
            </div>
          )}

          <label
            htmlFor="cafe-photo-input"
            className={`flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-2.5 rounded-xl text-xs border border-amber-200/50 transition-all cursor-pointer ${
              isUploading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {isUploading ? (
              <>{t('profile.uploading')}</>
            ) : (
              <>
                <Upload size={14} />
                {t('profile.upload_photo')}
              </>
            )}
          </label>
          <input
            ref={photoInputRef}
            id="cafe-photo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
            disabled={isUploading}
          />

          {photoStatus && (
            <div
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                photoStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                  : 'bg-rose-50 border border-rose-100 text-rose-600'
              }`}
            >
              {photoStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{photoStatus.text}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Café logo — its own card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-stone-700">{t('profile.logo_label')}</span>
          </div>
          <p className="text-[11px] text-stone-400 font-medium">{t('profile.logo_hint')}</p>

          {cafeLogoUrl ? (
            <div className="w-full h-20 rounded-xl border border-stone-200/70 bg-stone-50 flex items-center justify-center p-3">
              <img src={cafeLogoUrl} alt={t('profile.logo_label')} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="w-full h-16 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex items-center justify-center text-stone-400 text-xs font-semibold">
              PNG / SVG
            </div>
          )}

          <label
            htmlFor="cafe-logo-input"
            className={`flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-2.5 rounded-xl text-xs border border-amber-200/50 transition-all cursor-pointer ${
              isLogoUploading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {isLogoUploading ? (
              <>{t('profile.uploading')}</>
            ) : (
              <>
                <Upload size={14} />
                {t('profile.upload_logo')}
              </>
            )}
          </label>
          <input
            ref={logoInputRef}
            id="cafe-logo-input"
            type="file"
            accept=".png,.svg,image/png,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
            disabled={isLogoUploading}
          />

          {logoStatus && (
            <div
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                logoStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                  : 'bg-rose-50 border border-rose-100 text-rose-600'
              }`}
            >
              {logoStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{logoStatus.text}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Working hours — its own card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-stone-700">{t('profile.hours_label')}</span>
          </div>
          <p className="text-[11px] text-stone-400 font-medium">{t('profile.hours_hint')}</p>

          <form onSubmit={handleSaveHours} className="flex flex-col gap-2">
            <div className="flex flex-col gap-1.5">
              {HOUR_DAYS.map((d) => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="w-8 text-xs font-bold text-stone-500 shrink-0">{t(d.labelKey)}</span>
                  <input
                    type="time"
                    value={hoursForm[d.key].open}
                    onChange={(e) =>
                      setHoursForm((prev) => ({ ...prev, [d.key]: { ...prev[d.key], open: e.target.value } }))
                    }
                    aria-label={`${t(d.labelKey)} ${t('profile.hours_open')}`}
                    className="flex-1 min-w-0 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-stone-400 text-xs">–</span>
                  <input
                    type="time"
                    value={hoursForm[d.key].close}
                    onChange={(e) =>
                      setHoursForm((prev) => ({ ...prev, [d.key]: { ...prev[d.key], close: e.target.value } }))
                    }
                    aria-label={`${t(d.labelKey)} ${t('profile.hours_close')}`}
                    className="flex-1 min-w-0 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              ))}
            </div>
            <button
              id="save-hours-btn"
              type="submit"
              className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <Check size={14} />
              {t('profile.save_info')}
            </button>
            {hoursStatus && (
              <div
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  hoursStatus.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                    : 'bg-rose-50 border border-rose-100 text-rose-600'
                }`}
              >
                {hoursStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{hoursStatus.text}</span>
              </div>
            )}
          </form>
        </div>
      </motion.div>

      {/* Account + change password — one card, at the bottom */}
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

        <div className="border-t border-stone-100" />

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

      {/* Crop dialog: zoom + pan before uploading */}
      <AnimatePresence>
        {pendingPhoto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelCrop}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 max-w-md mx-auto pointer-events-none"
            >
              <div className="bg-white rounded-2xl p-4 w-full pointer-events-auto flex flex-col gap-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Camera size={16} className="text-amber-600" />
                    {t('profile.crop_title')}
                  </h3>
                  <button
                    type="button"
                    onClick={cancelCrop}
                    className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                    title={t('profile.crop_cancel')}
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 font-medium">{t('profile.crop_hint')}</p>

                <div
                  ref={cropViewportRef}
                  onPointerDown={onCropPointerDown}
                  onPointerMove={onCropPointerMove}
                  onPointerUp={onCropPointerUp}
                  onPointerLeave={onCropPointerUp}
                  className="relative w-full aspect-[28/15] overflow-hidden rounded-xl cursor-grab active:cursor-grabbing touch-none select-none"
                  style={{
                    // Checkerboard so transparent areas read as "transparent",
                    // not as a broken black background.
                    backgroundImage:
                      'conic-gradient(#e7e5e4 90deg, #f5f5f4 90deg 180deg, #e7e5e4 180deg 270deg, #f5f5f4 270deg)',
                    backgroundSize: '16px 16px',
                  }}
                >
                  <img
                    ref={cropImageRef}
                    src={pendingPhoto.url}
                    alt=""
                    draggable={false}
                    onLoad={initCrop}
                    className="absolute left-1/2 top-1/2 max-w-none"
                    style={{
                      transform: `translate(-50%, -50%) translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropScale})`,
                    }}
                  />
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeZoom(cropScale - minScale * 0.1)}
                    className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-stone-200 transition-colors shrink-0"
                    title={t('profile.crop_zoom_out')}
                  >
                    <ZoomOut size={15} />
                  </button>
                  <input
                    type="range"
                    min={minScale}
                    max={minScale * 4}
                    step={0.05}
                    value={cropScale}
                    onChange={(e) => changeZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-600"
                    aria-label={t('profile.crop_zoom')}
                  />
                  <button
                    type="button"
                    onClick={() => changeZoom(cropScale + minScale * 0.1)}
                    className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-stone-200 transition-colors shrink-0"
                    title={t('profile.crop_zoom_in')}
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={initCrop}
                    className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-stone-200 transition-colors shrink-0"
                    title={t('profile.crop_reset')}
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelCrop}
                    className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold py-2.5 rounded-xl text-xs transition-all active:scale-95"
                  >
                    {t('profile.crop_cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={applyCrop}
                    disabled={isCropping}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {isCropping ? (
                      <>{t('profile.uploading')}</>
                    ) : (
                      <>
                        <Check size={14} />
                        {t('profile.crop_apply')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
