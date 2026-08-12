'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useQRMenu, MenuItem, Category, Order, OrderStatus } from '../lib/store';
import { supabase } from '../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X,
  Volume2, 
  VolumeX, 
  Users, 
  UtensilsCrossed, 
  FileText,
  Clock,
  ExternalLink,
  Download,
  Camera,
  Upload,
  Sliders,
  DollarSign,
  AlertCircle,
  ClipboardList,
  Utensils,
  FolderTree,
  QrCode
} from 'lucide-react';

// Preset Food Photo list
const IMAGE_PRESETS = [
  { name: 'Pizza Margherita', url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80' },
  { name: 'Pepperoni Pizza', url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=500&q=80' },
  { name: 'Beef Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80' },
  { name: 'Chicken Burger', url: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=500&q=80' },
  { name: 'Fries', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80' },
  { name: 'Caesar Salad', url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=500&q=80' },
  { name: 'Greek Salad', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80' },
  { name: 'Tomato Soup', url: 'https://images.unsplash.com/photo-1547592165-e1d17fed6006?auto=format&fit=crop&w=500&q=80' },
  { name: 'Mushroom Soup', url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=80' },
  { name: 'Sushi Set', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80' },
  { name: 'Cheesecake', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80' },
  { name: 'Chocolate Cake', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80' },
  { name: 'Pancakes', url: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=500&q=80' },
  { name: 'Cappuccino', url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=80' },
  { name: 'Iced Coffee', url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80' },
  { name: 'Citrus Lemonade', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80' },
  { name: 'Green Tea', url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=500&q=80' },
  { name: 'Red Wine', url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=500&q=80' },
];

// Allowed order status transitions (workflow guard)
const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

export default function OwnerCabinet() {
  const {
    menuItems,
    categories,
    orders,
    tables,
    language,
    isOwner,
    ownerEmail,
    isLoading,
    soundEnabled,
    signIn,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    addCategory,
    updateCategory,
    deleteCategory,
    updateOrderStatus,
    deleteOrder,
    addTable,
    deleteTable,
    t
  } = useQRMenu();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<boolean>(false);

  // Tabs: 'orders', 'menu', 'categories', 'tables'
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'categories' | 'tables'>('orders');

  // Sound toggle is now shared (header More menu)
  const prevOrdersCountRef = useRef<number>(0);

  // Menu editor modal/form state
  const [isMenuFormOpen, setIsMenuFormOpen] = useState<boolean>(false);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
  const [menuFormState, setMenuFormState] = useState({
    nameUa: '',
    nameEn: '',
    nameHu: '',
    descriptionUa: '',
    descriptionEn: '',
    descriptionHu: '',
    ingredientsUa: '',
    ingredientsEn: '',
    ingredientsHu: '',
    price: 0,
    category: '',
    image: '',
    isAvailable: true
  });
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState<boolean>(false);
  
  // Custom Image Upload State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => {
          reject(err);
        };
      };
      reader.onerror = (err) => {
        reject(err);
      };
    });
  };

  // dataURL -> Blob so compressed images can be uploaded to Supabase Storage
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError(t('menu.invalid_file'));
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const base64Url = await compressImage(file);
      // Upload to Supabase Storage instead of storing a data-URL
      const path = `menu/${crypto.randomUUID?.() ?? Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('dish-images')
        .upload(path, dataUrlToBlob(base64Url), { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('dish-images').getPublicUrl(path);
      setMenuFormState(prev => ({ ...prev, image: pub.publicUrl }));
    } catch (err) {
      console.error('Error uploading image: ', err);
      setUploadError(t('menu.upload_error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  // Categories editor form state
  const [isCatFormOpen, setIsCatFormOpen] = useState<boolean>(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormState, setCatFormState] = useState({
    nameUa: '',
    nameEn: '',
    nameHu: '',
    icon: '🍕'
  });

  // Table creator state
  const [newTableNumber, setNewTableNumber] = useState<string>('');

  // Base URL used for QR codes (guest menu link)
  const baseOriginUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Locally generated QR data URLs per table (replaces external qrserver API)
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  // Regenerate QR codes whenever tables change
  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      const entries: Record<string, string> = {};
      for (const label of tables) {
        try {
          entries[label] = await QRCode.toDataURL(`${baseOriginUrl}/?table=${label}`, {
            width: 400,
            margin: 2,
            color: { dark: '#1c1917', light: '#ffffff' },
          });
        } catch (e) {
          console.error('QR generation failed for table', label, e);
        }
      }
      if (!cancelled) setQrDataUrls(entries);
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [tables, baseOriginUrl]);

  // Swipe/drag-scroll for admin tabs
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const tabsIsDown = useRef(false);
  const tabsStartX = useRef(0);
  const tabsScrollLeft = useRef(0);
  const tabsDragMoved = useRef(false);

  const handleTabsMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabsScrollRef.current) return;
    tabsIsDown.current = true;
    tabsDragMoved.current = false;
    tabsStartX.current = e.pageX - tabsScrollRef.current.offsetLeft;
    tabsScrollLeft.current = tabsScrollRef.current.scrollLeft;
  };

  const handleTabsMouseLeave = () => {
    tabsIsDown.current = false;
  };

  const handleTabsMouseUp = () => {
    tabsIsDown.current = false;
  };

  const handleTabsMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabsIsDown.current || !tabsScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsScrollRef.current.offsetLeft;
    const walk = (x - tabsStartX.current) * 1.5; // scroll speed
    if (Math.abs(x - tabsStartX.current) > 5) {
      tabsDragMoved.current = true;
    }
    tabsScrollRef.current.scrollLeft = tabsScrollLeft.current - walk;
  };

  const handleTabClick = (tab: 'orders' | 'menu' | 'categories' | 'tables', e: React.MouseEvent) => {
    if (tabsDragMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setActiveTab(tab);
  };

  // Audio synthesis chime for new orders
  const playNewOrderChime = React.useCallback(() => {
    if (!soundEnabled) return;
    try {
      // Standard HTML5 Audio Synthesis (Web Audio API)
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Chime note 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Chime note 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.error("Audio synthesis error: ", e);
    }
  }, [soundEnabled]);

  // Session login checked synchronously on initialization

  // Monitor for new orders to play chime
  useEffect(() => {
    if (!isOwner) return;
    const currentNewOrdersCount = orders.filter(o => o.status === 'new').length;
    
    // Play chime only if current new count increases
    if (currentNewOrdersCount > prevOrdersCountRef.current) {
      playNewOrderChime();
    }
    prevOrdersCountRef.current = currentNewOrdersCount;
  }, [orders, isOwner, playNewOrderChime]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await signIn(email.trim(), password);
    if (error) {
      console.error('Login failed', error);
      setLoginError(true);
    } else {
      setLoginError(false);
      setPassword('');
    }
  };

  const downloadQRCode = async (tableId: string) => {
    try {
      const guestMenuUrl = `${baseOriginUrl}/?table=${tableId}`;
      const qrDataUrl = await QRCode.toDataURL(guestMenuUrl, {
        width: 800,
        margin: 2,
        color: {
          dark: '#1c1917', // stone-900 color
          light: '#ffffff'
        }
      });
      
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `qr_code_table_${tableId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to generate or download QR code:", e);
    }
  };

  // Open Menu Item Form for adding
  const openAddMenuForm = () => {
    setEditingMenuItemId(null);
    setMenuFormState({
      nameUa: '',
      nameEn: '',
      nameHu: '',
      descriptionUa: '',
      descriptionEn: '',
      descriptionHu: '',
      ingredientsUa: '',
      ingredientsEn: '',
      ingredientsHu: '',
      price: 150,
      category: categories[0]?.id || '',
      image: IMAGE_PRESETS[0].url,
      isAvailable: true
    });
    setIsMenuFormOpen(true);
  };

  // Open Menu Item Form for editing
  const openEditMenuForm = (item: MenuItem) => {
    setEditingMenuItemId(item.id);
    setMenuFormState({
      nameUa: item.nameUa,
      nameEn: item.nameEn,
      nameHu: item.nameHu || '',
      descriptionUa: item.descriptionUa,
      descriptionEn: item.descriptionEn,
      descriptionHu: item.descriptionHu || '',
      ingredientsUa: item.ingredientsUa,
      ingredientsEn: item.ingredientsEn,
      ingredientsHu: item.ingredientsHu || '',
      price: item.price,
      category: item.category,
      image: item.image,
      isAvailable: item.isAvailable
    });
    setIsMenuFormOpen(true);
  };

  // Save Menu Item
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuFormState.nameUa || !menuFormState.nameEn || !menuFormState.nameHu) return;
    const price = Math.round(Number(menuFormState.price));
    if (Number.isNaN(price) || price < 0) {
      window.alert(t('menu.price_invalid'));
      return;
    }
    const payload = { ...menuFormState, price };
    try {
      if (editingMenuItemId) {
        await updateMenuItem(editingMenuItemId, payload);
      } else {
        await addMenuItem(payload);
      }
      setIsMenuFormOpen(false);
    } catch (err) {
      console.error('Failed to save menu item', err);
      window.alert(t('common.save_error'));
    }
  };

  // Open Category Form for adding
  const openAddCatForm = () => {
    setEditingCatId(null);
    setCatFormState({
      nameUa: '',
      nameEn: '',
      nameHu: '',
      icon: '🍕'
    });
    setIsCatFormOpen(true);
  };

  // Open Category Form for editing
  const openEditCatForm = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatFormState({
      nameUa: cat.nameUa,
      nameEn: cat.nameEn,
      nameHu: cat.nameHu || '',
      icon: cat.icon
    });
    setIsCatFormOpen(true);
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormState.nameUa || !catFormState.nameEn || !catFormState.nameHu) return;

    try {
      if (editingCatId) {
        await updateCategory(editingCatId, catFormState);
      } else {
        await addCategory(catFormState);
      }
      setIsCatFormOpen(false);
    } catch (err) {
      console.error('Failed to save category', err);
      window.alert(t('common.save_error'));
    }
  };

  // Create Table
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTable = newTableNumber.trim();
    if (!cleanTable) return;
    try {
      await addTable(cleanTable);
      setNewTableNumber('');
    } catch (err) {
      console.error('Failed to create table', err);
      window.alert(t('common.save_error'));
    }
  };

  // Stats calculators
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const pendingOrdersCount = orders.filter(o => o.status === 'new' || o.status === 'preparing').length;

  if (!isOwner) {
    return (
      <div id="admin-login-wrapper" className="w-full max-w-md mx-auto bg-stone-50 min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full p-6 rounded-2xl border border-stone-200 shadow-xl flex flex-col gap-5 text-stone-800"
        >
          <div className="flex flex-col gap-1 items-center text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-2">
              <Sliders size={24} />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              {t('login.title')}
            </h2>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-email-field" className="text-xs font-bold text-stone-500">
                {t('login.email')}
              </label>
              <input
                id="admin-email-field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@cafe.com"
                autoComplete="email"
                className="w-full bg-stone-50 px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-password-field" className="text-xs font-bold text-stone-500">
                {t('login.password')}
              </label>
              <input
                id="admin-password-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-stone-50 px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            {loginError && (
              <div id="login-error-alert" className="bg-rose-50 border border-rose-100 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{t('login.invalid')}</span>
              </div>
            )}

            <button
              id="admin-login-submit"
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md active:scale-95 text-xs tracking-wider uppercase"
            >
              {t('login.submit')}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="admin-panel-container" className="w-full max-w-4xl mx-auto bg-stone-50 min-h-screen text-stone-800 pb-10">
      
      <div className="p-4 md:p-6 flex flex-col gap-6">
        {/* Panel title */}
        <h1 id="admin-panel-title" className="text-lg font-extrabold text-stone-900 tracking-tight">
          {t('dashboard.title')}
        </h1>
        
        {/* Stats Grid */}
        <div id="admin-stats-bar" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200/50 p-4 rounded-2xl shadow-sm flex flex-col gap-2.5">
            <span className="text-xs font-bold text-stone-900 leading-none">{t('orders.active_count')}</span>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <p id="stat-active-orders" className="text-xl font-black text-stone-900 leading-none">{pendingOrdersCount}</p>
            </div>
          </div>
          
          <div className="bg-white border border-stone-200/50 p-4 rounded-2xl shadow-sm flex flex-col gap-2.5">
            <span className="text-xs font-bold text-stone-900 leading-none">{t('dashboard.cash_revenue')}</span>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign size={20} />
              </div>
              <p id="stat-revenue" className="text-xl font-black text-stone-900 leading-none">{totalRevenue} ₴</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-4 rounded-2xl shadow-sm flex flex-col gap-2.5">
            <span className="text-xs font-bold text-stone-900 leading-none">{t('dashboard.dish_count')}</span>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <UtensilsCrossed size={20} />
              </div>
              <p id="stat-dishes" className="text-xl font-black text-stone-900 leading-none">{menuItems.length}</p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/50 p-4 rounded-2xl shadow-sm flex flex-col gap-2.5">
            <span className="text-xs font-bold text-stone-900 leading-none">{t('dashboard.table_count')}</span>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <p id="stat-tables" className="text-xl font-black text-stone-900 leading-none">{tables.length}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div 
          ref={tabsScrollRef}
          id="admin-tabs" 
          onMouseDown={handleTabsMouseDown}
          onMouseLeave={handleTabsMouseLeave}
          onMouseUp={handleTabsMouseUp}
          onMouseMove={handleTabsMouseMove}
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide select-none cursor-grab active:cursor-grabbing"
        >
          <button
            id="tab-btn-orders"
            onClick={(e) => handleTabClick('orders', e)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-white shadow-amber-200'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/50'
            }`}
          >
            <ClipboardList size={14} className={activeTab === 'orders' ? 'text-white' : 'text-amber-600'} />
            {t('dashboard.tab_orders')}
          </button>
          <button
            id="tab-btn-menu"
            onClick={(e) => handleTabClick('menu', e)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'menu'
                ? 'bg-amber-600 text-white shadow-amber-200'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/50'
            }`}
          >
            <Utensils size={14} className={activeTab === 'menu' ? 'text-white' : 'text-amber-600'} />
            {t('dashboard.tab_menu')}
          </button>
          <button
            id="tab-btn-categories"
            onClick={(e) => handleTabClick('categories', e)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'categories'
                ? 'bg-amber-600 text-white shadow-amber-200'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/50'
            }`}
          >
            <FolderTree size={14} className={activeTab === 'categories' ? 'text-white' : 'text-amber-600'} />
            {t('dashboard.tab_categories')}
          </button>
          <button
            id="tab-btn-tables"
            onClick={(e) => handleTabClick('tables', e)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
              activeTab === 'tables'
                ? 'bg-amber-600 text-white shadow-amber-200'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/50'
            }`}
          >
            <QrCode size={14} className={activeTab === 'tables' ? 'text-white' : 'text-amber-600'} />
            {t('dashboard.tab_tables')}
          </button>
        </div>

        {/* Tab 1: Orders Monitor */}
        {activeTab === 'orders' && (
          <div id="orders-monitor" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-stone-400">
                Монітор активності кухні
              </h2>
              {orders.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-800 font-extrabold px-2.5 py-1 rounded-lg">
                  {orders.length} замовлень в базі
                </span>
              )}
            </div>

            {orders.length > 0 ? (
              <div className="flex flex-col gap-4">
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    id={`order-row-${order.id}`}
                    className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4 transition-all ${
                      order.status === 'new' 
                        ? 'border-l-4 border-l-rose-500 border-stone-200' 
                        : order.status === 'preparing'
                        ? 'border-l-4 border-l-amber-500 border-stone-200'
                        : order.status === 'delivered'
                        ? 'border-l-4 border-l-blue-500 border-stone-200'
                        : order.status === 'completed'
                        ? 'border-l-4 border-l-emerald-500 border-stone-200 opacity-80'
                        : 'border-l-4 border-l-stone-400 border-stone-200 opacity-70'
                    }`}
                  >
                    <div className="flex-1 flex flex-col gap-2.5">
                      {/* Order info */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-stone-900 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                          Стіл #{order.tableId}
                        </span>
                        <span className="text-stone-400 text-xs font-semibold">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-stone-300 font-medium">
                          ({order.id})
                        </span>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-1.5 bg-stone-50/50 p-2.5 rounded-xl border border-stone-200/20">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-stone-800">
                              <span className="text-amber-600 bg-amber-50 border border-amber-200/50 w-5 h-5 rounded flex items-center justify-center text-xs font-black">
                                {it.quantity}
                              </span>
                              <span>{language === 'ua' ? it.nameUa : language === 'hu' ? (it.nameHu || it.nameEn || it.nameUa) : it.nameEn}</span>
                            </div>
                            <span className="font-extrabold text-stone-600">{it.price * it.quantity} ₴</span>
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="bg-amber-50/40 p-2 rounded-lg border border-amber-200/30 text-xs">
                          <span className="font-extrabold text-amber-800">{t('orders.notes')} </span>
                          <span className="text-amber-950 font-medium">{order.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col justify-between items-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100 w-full md:w-48">
                      <div className="flex justify-between items-center w-full sm:w-32 md:w-full gap-4 pb-1">
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">{t('orders.grand_total')}</span>
                        <span className="text-base font-black text-stone-900">{order.totalPrice} ₴</span>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-wrap gap-1.5 justify-end w-full sm:w-auto">
                        <select
                          id={`status-select-${order.id}`}
                          value={order.status}
                          onChange={(e) => {
                            const next = e.target.value as OrderStatus;
                            if (next === order.status) return;
                            if (!ALLOWED_STATUS_TRANSITIONS[order.status].includes(next)) {
                              window.alert(t('orders.invalid_transition'));
                              return;
                            }
                            updateOrderStatus(order.id, next).catch((err) => {
                              console.error('Failed to update order status', err);
                              window.alert(t('common.save_error'));
                            });
                          }}
                          className={`text-xs font-black px-2.5 py-1.5 rounded-xl border focus:outline-none transition-colors ${
                            order.status === 'new'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : order.status === 'preparing'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : order.status === 'delivered'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : order.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-stone-50 text-stone-600 border-stone-200'
                          }`}
                        >
                          <option value="new">🆕 {t('orders.status_new')}</option>
                          <option value="preparing">🍳 {t('orders.status_preparing')}</option>
                          <option value="delivered">🍽️ {t('orders.status_delivered')}</option>
                          <option value="completed">✅ {t('orders.status_completed')}</option>
                          <option value="cancelled">❌ {t('orders.status_cancelled')}</option>
                        </select>

                        <button
                          id={`delete-order-${order.id}`}
                          onClick={async () => {
                            if (confirm(t('orders.delete_confirm'))) {
                              try {
                                await deleteOrder(order.id);
                              } catch (err) {
                                console.error('Failed to delete order', err);
                                window.alert(t('common.delete_error'));
                              }
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-stone-100 hover:border-rose-100 bg-white"
                          title={t('orders.delete_title')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border p-12 text-center flex flex-col items-center justify-center text-stone-400 shadow-sm">
                <FileText size={40} className="text-stone-300 mb-3" />
                <p className="font-semibold text-sm">{t('orders.no_orders')}</p>
                <p className="text-xs text-stone-400 mt-1">{t('orders.empty_hint')}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Menu Items Editor */}
        {activeTab === 'menu' && (
          <div id="menu-items-editor" className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-stone-400">
                Каталог страв кафе ({menuItems.length})
              </h2>
              <button
                id="add-new-dish-btn"
                onClick={openAddMenuForm}
                className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95"
              >
                <Plus size={14} />
                {t('menu.add_item')}
              </button>
            </div>

            {/* Menu Items Grid */}
            <div id="admin-menu-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems.map((item) => {
                const categoryObj = categories.find(c => c.id === item.category);
                const categoryLabel = categoryObj 
                  ? (language === 'ua' ? categoryObj.nameUa : language === 'hu' ? (categoryObj.nameHu || categoryObj.nameEn || categoryObj.nameUa) : categoryObj.nameEn)
                  : item.category;

                return (
                  <div key={item.id} id={`admin-dish-${item.id}`} className="bg-white border border-stone-200/50 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all flex gap-3 overflow-hidden relative">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'}
                      alt={item.nameUa}
                      className="w-20 h-20 object-cover rounded-xl shrink-0 bg-stone-100"
                    />

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-extrabold text-stone-900 text-sm leading-tight truncate">
                            {language === 'ua' ? item.nameUa : language === 'hu' ? (item.nameHu || item.nameEn || item.nameUa) : item.nameEn}
                          </h3>
                          <span className="text-amber-700 font-extrabold text-sm whitespace-nowrap shrink-0">
                            {item.price} ₴
                          </span>
                        </div>
                        <span className="text-xs text-stone-400 font-bold tracking-wide uppercase leading-none">
                          {categoryLabel}
                        </span>
                        <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                          {language === 'ua' ? item.descriptionUa : language === 'hu' ? (item.descriptionHu || item.descriptionEn || item.descriptionUa) : item.descriptionEn}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
                        {/* Availability pill */}
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          item.isAvailable 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200/40'
                        }`}>
                          {item.isAvailable ? t('menu.available_badge') : t('menu.hidden_badge')}
                        </span>

                        <div className="flex gap-1.5">
                          <button
                            id={`edit-dish-btn-${item.id}`}
                            onClick={() => openEditMenuForm(item)}
                            className="p-1.5 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-stone-100 bg-white"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            id={`delete-dish-btn-${item.id}`}
                            onClick={async () => {
                              if (confirm(t('menu.delete_item_confirm'))) {
                                try {
                                  await deleteMenuItem(item.id);
                                } catch (err) {
                                  console.error('Failed to delete dish', err);
                                  window.alert(t('common.delete_error'));
                                }
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-stone-100 bg-white"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Categories Editor */}
        {activeTab === 'categories' && (
          <div id="categories-editor" className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-stone-400">
                {t('menu.categories_title')}
              </h2>
              <button
                id="add-new-cat-btn"
                onClick={openAddCatForm}
                className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95"
              >
                <Plus size={14} />
                {t('cat.add_category')}
              </button>
            </div>

            <div id="admin-categories-list" className="bg-white border border-stone-200/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 divide-y divide-stone-100">
                {categories.map((cat) => (
                  <div key={cat.id} id={`admin-cat-${cat.id}`} className="flex items-center justify-between p-4 hover:bg-stone-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl bg-stone-100 w-10 h-10 rounded-xl flex items-center justify-center shadow-inner">
                        {cat.icon}
                      </span>
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">
                          УКР: {cat.nameUa}
                        </h4>
                        <p className="text-xs text-stone-500 font-medium">
                          ENG: {cat.nameEn}
                        </p>
                        <p className="text-xs text-stone-500 font-medium">
                          HUN: {cat.nameHu || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        id={`edit-cat-${cat.id}`}
                        onClick={() => openEditCatForm(cat)}
                        className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-stone-100 bg-white"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        id={`delete-cat-${cat.id}`}
                        onClick={async () => {
                          if (confirm(t('cat.delete_confirm'))) {
                            try {
                              await deleteCategory(cat.id);
                            } catch (err) {
                              console.error('Failed to delete category', err);
                              window.alert(t('common.delete_error'));
                            }
                          }
                        }}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-stone-100 bg-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Tables and QR Generator */}
        {activeTab === 'tables' && (
          <div id="tables-generator" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-stone-400">
                {t('tables.title')}
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed max-w-2xl">
                {t('tables.instruction')}
              </p>
            </div>

            {/* Create Table Form */}
            <form onSubmit={handleCreateTable} className="bg-white border border-stone-200/50 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 flex flex-col gap-1.5 w-full">
                <label htmlFor="new-table-input" className="text-xs font-bold text-stone-500">
                  {t('tables.add_table')}
                </label>
                <input
                  id="new-table-input"
                  type="text"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder={t('tables.placeholder')}
                  className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <button
                id="submit-new-table-btn"
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs shadow transition-all active:scale-95 shrink-0 w-full sm:w-auto h-11 flex items-center justify-center gap-1"
              >
                <Plus size={14} />
                {t('tables.add_table')}
              </button>
            </form>

            {/* QR Codes Grid */}
            <div id="qr-codes-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {tables.map((tableId) => {
                // Point URL specifically with table parameter
                const guestMenuUrl = `${baseOriginUrl}/?table=${tableId}`;

                return (
                  <div 
                    key={tableId} 
                    id={`table-qr-card-${tableId}`}
                    className="bg-white border-2 border-stone-200/60 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden"
                  >
                    {/* Delete table */}
                    <button
                      id={`delete-table-${tableId}`}
                      onClick={async () => {
                        if (confirm(t('tables.delete_confirm'))) {
                          try {
                            await deleteTable(tableId);
                          } catch (err) {
                            console.error('Failed to delete table', err);
                            window.alert(t('common.delete_error'));
                          }
                        }
                      }}
                      className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-stone-100 bg-white shadow-sm"
                      title={t('tables.delete_title')}
                    >
                      <Trash2 size={12} />
                    </button>

                    {/* Flyer Content */}
                    <div className="flex flex-col items-center gap-2 mb-4 w-full">
                      <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md shadow-amber-200">
                        {tableId}
                      </div>
                      <h4 className="font-extrabold text-stone-900 text-sm uppercase tracking-wide mt-1">
                        {t('tables.print_title')}
                      </h4>
                      <p className="text-xs text-stone-400 font-semibold tracking-wide uppercase leading-none">
                        Стіл №{tableId}
                      </p>
                    </div>

                    {/* QR Code Frame */}
                    <div className="bg-stone-50 border border-stone-200/60 p-4 rounded-2xl shadow-inner mb-4 relative group">
                      <img
                        src={qrDataUrls[tableId]}
                        alt={`QR Code Table ${tableId}`}
                        className="w-40 h-40 object-contain mx-auto"
                        loading="lazy"
                      />
                    </div>

                    <p className="text-stone-500 text-xs italic mb-4 font-medium leading-normal max-w-[200px]">
                      {t('tables.print_scan')}
                    </p>

                    {/* Simulation buttons */}
                    <div className="w-full flex flex-col gap-2 pt-2 border-t border-stone-100">
                      <button
                        id={`download-qr-btn-${tableId}`}
                        onClick={() => downloadQRCode(tableId)}
                        className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-amber-200/40 shadow-sm"
                      >
                        <Download size={13} />
                        {t('tables.download_qr')}
                      </button>
                      <button
                        id={`simulate-scan-btn-${tableId}`}
                        onClick={() => window.open(guestMenuUrl, '_blank')}
                        className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 border border-stone-200/40"
                      >
                        <ExternalLink size={12} />
                        {t('tables.open_menu_simulation')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Form Overlay for Adding/Editing Menu Items */}
      <AnimatePresence>
        {isMenuFormOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuFormOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Slide-over */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col text-stone-800"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-stone-200/60 flex items-center justify-between bg-stone-50">
                <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
                  <span>🍔</span>
                  {editingMenuItemId ? t('menu.edit_item') : t('menu.add_item')}
                </h3>
                <button
                  onClick={() => setIsMenuFormOpen(false)}
                  className="p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveMenuItem} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                
                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="dish-name-ua" className="text-xs font-bold text-stone-500">{t('menu.name_ua')}</label>
                    <input
                      id="dish-name-ua"
                      type="text"
                      value={menuFormState.nameUa}
                      onChange={(e) => setMenuFormState(prev => ({ ...prev, nameUa: e.target.value }))}
                      placeholder={t('menu.name_placeholder')}
                      className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="dish-name-en" className="text-xs font-bold text-stone-500">{t('menu.name_en')}</label>
                    <input
                      id="dish-name-en"
                      type="text"
                      value={menuFormState.nameEn}
                      onChange={(e) => setMenuFormState(prev => ({ ...prev, nameEn: e.target.value }))}
                      placeholder="Pepperoni Pizza"
                      className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="dish-name-hu" className="text-xs font-bold text-stone-500">{t('menu.name_hu')}</label>
                    <input
                      id="dish-name-hu"
                      type="text"
                      value={menuFormState.nameHu}
                      onChange={(e) => setMenuFormState(prev => ({ ...prev, nameHu: e.target.value }))}
                      placeholder="Pepperoni Pizza (HU)"
                      className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* Price and Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="dish-price-input" className="text-xs font-bold text-stone-500">{t('menu.price_label')}</label>
                    <input
                      id="dish-price-input"
                      type="number"
                      value={menuFormState.price}
                      onChange={(e) => setMenuFormState(prev => ({ ...prev, price: Math.max(0, Math.round(Number(e.target.value) || 0)) }))}
                      className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                      min={0}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="dish-cat-select" className="text-xs font-bold text-stone-500">{t('menu.category_label')}</label>
                    <select
                      id="dish-cat-select"
                      value={menuFormState.category}
                      onChange={(e) => setMenuFormState(prev => ({ ...prev, category: e.target.value }))}
                      className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {language === 'ua' ? c.nameUa : language === 'hu' ? (c.nameHu || c.nameEn || c.nameUa) : c.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Photo Image Upload & Preset selector */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-stone-500">{t('menu.upload_image')}</span>
                  
                  {/* File Upload Drop Zone */}
                  <div
                    id="image-dropzone"
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[140px] overflow-hidden ${
                      dragActive 
                        ? 'border-amber-500 bg-amber-50/50' 
                        : menuFormState.image 
                          ? 'border-stone-200 bg-stone-50' 
                          : 'border-stone-200/80 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <input
                      id="dish-file-upload-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-semibold text-stone-500">{t('menu.compressing')}</p>
                      </div>
                    ) : menuFormState.image ? (
                      <div className="w-full flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-16 rounded-xl border border-stone-200 overflow-hidden flex-shrink-0 bg-white">
                            <img
                              src={menuFormState.image}
                              alt="Uploaded preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5 inline-block mb-1">
                              {menuFormState.image.startsWith('data:image/') ? t('menu.photo_custom') : t('menu.photo_preset')}
                            </span>
                            <p className="text-xs text-stone-400 max-w-[200px] truncate">{menuFormState.image}</p>
                          </div>
                        </div>
                        <button
                          id="clear-uploaded-image-btn"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFormState(prev => ({ ...prev, image: '' }));
                          }}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-all border border-stone-200/50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-2">
                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100/50 flex items-center justify-center text-amber-700">
                          <Upload size={18} />
                        </div>
                        <p className="text-xs font-bold text-stone-700">{t('menu.drag_and_drop')}</p>
                        <p className="text-xs text-stone-400">PNG, JPG, WEBP (max. 10MB)</p>
                      </div>
                    )}
                  </div>

                  {/* Upload error display */}
                  {uploadError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 animate-pulse">
                      <AlertCircle size={13} />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Select Preset & Manual Input toggle */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('menu.image_or')}</span>
                      <button
                        id="pick-preset-photo-btn"
                        type="button"
                        onClick={() => setIsPhotoPickerOpen(true)}
                        className="text-amber-700 hover:text-amber-800 text-xs font-extrabold flex items-center gap-1 transition-all"
                      >
                        <Camera size={13} />
                        <span>{t('menu.use_preset_img')}</span>
                      </button>
                    </div>
                    <input
                      id="dish-image-input"
                      type="text"
                      value={menuFormState.image}
                      onChange={(e) => setMenuFormState(prev => ({ ...prev, image: e.target.value }))}
                      className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                  </div>
                </div>

                {/* Descriptions */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="dish-desc-ua" className="text-xs font-bold text-stone-500">{t('menu.desc_ua')}</label>
                  <textarea
                    id="dish-desc-ua"
                    rows={2}
                    value={menuFormState.descriptionUa}
                    onChange={(e) => setMenuFormState(prev => ({ ...prev, descriptionUa: e.target.value }))}
                    placeholder={t('menu.desc_placeholder')}
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="dish-desc-en" className="text-xs font-bold text-stone-500">{t('menu.desc_en')}</label>
                  <textarea
                    id="dish-desc-en"
                    rows={2}
                    value={menuFormState.descriptionEn}
                    onChange={(e) => setMenuFormState(prev => ({ ...prev, descriptionEn: e.target.value }))}
                    placeholder="Delicious classic pizza with tomatoes..."
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="dish-desc-hu" className="text-xs font-bold text-stone-500">{t('menu.desc_hu')}</label>
                  <textarea
                    id="dish-desc-hu"
                    rows={2}
                    value={menuFormState.descriptionHu}
                    onChange={(e) => setMenuFormState(prev => ({ ...prev, descriptionHu: e.target.value }))}
                    placeholder="Finom klasszikus pizza paradicsommal..."
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    required
                  />
                </div>

                {/* Ingredients */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="dish-ingr-ua" className="text-xs font-bold text-stone-500">{t('menu.ingr_ua')}</label>
                  <input
                    id="dish-ingr-ua"
                    type="text"
                    value={menuFormState.ingredientsUa}
                    onChange={(e) => setMenuFormState(prev => ({ ...prev, ingredientsUa: e.target.value }))}
                    placeholder={t('menu.ingr_placeholder')}
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="dish-ingr-en" className="text-xs font-bold text-stone-500">{t('menu.ingr_en')}</label>
                  <input
                    id="dish-ingr-en"
                    type="text"
                    value={menuFormState.ingredientsEn}
                    onChange={(e) => setMenuFormState(prev => ({ ...prev, ingredientsEn: e.target.value }))}
                    placeholder="tomato sauce, mozzarella, basil"
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="dish-ingr-hu" className="text-xs font-bold text-stone-500">{t('menu.ingr_hu')}</label>
                  <input
                    id="dish-ingr-hu"
                    type="text"
                    value={menuFormState.ingredientsHu}
                    onChange={(e) => setMenuFormState(prev => ({ ...prev, ingredientsHu: e.target.value }))}
                    placeholder="paradicsomszósz, mozzarella, bazsalikom"
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {/* Availability Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200/50 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-extrabold text-stone-800">{t('menu.available_label')}</span>
                    <span className="text-xs text-stone-400">{t('menu.availability_hint')}</span>
                  </div>
                  <input
                    id="dish-available-switch"
                    type="checkbox"
                    checked={menuFormState.isAvailable}
                    onChange={(e) => setMenuFormState(prev => ({ ...prev, isAvailable: e.target.checked }))}
                    className="w-10 h-5 bg-stone-200 checked:bg-amber-600 rounded-full cursor-pointer appearance-none relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all shadow-sm"
                  />
                </div>

              {/* Form Footer */}
              <div className="p-5 border-t border-stone-200/60 bg-stone-50 flex gap-3">
                <button
                  id="cancel-dish-btn"
                  type="button"
                  onClick={() => setIsMenuFormOpen(false)}
                  className="flex-1 bg-white border border-stone-200 text-stone-700 font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all hover:bg-stone-50 active:scale-95"
                >
                  {t('menu.cancel')}
                </button>
                <button
                  id="save-dish-submit-btn"
                  type="submit"
                  disabled={!menuFormState.nameUa || !menuFormState.nameEn || !menuFormState.nameHu}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check size={16} />
                  {t('menu.save')}
                </button>
              </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preset Photo Picker Modal Dialog */}
      <AnimatePresence>
        {isPhotoPickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl text-stone-800"
            >
              {/* Header */}
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <h4 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">
                  Оберіть апетитне зображення для меню
                </h4>
                <button
                  onClick={() => setIsPhotoPickerOpen(false)}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Photos grid */}
              <div id="photos-presets-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 overflow-y-auto max-h-[55vh]">
                {IMAGE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMenuFormState(prev => ({ ...prev, image: preset.url }));
                      setIsPhotoPickerOpen(false);
                    }}
                    className="flex flex-col text-left group overflow-hidden rounded-xl border border-stone-200 hover:border-amber-500 transition-all shadow-sm hover:shadow active:scale-95 bg-stone-50"
                  >
                    <div className="relative h-24 w-full bg-stone-200">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <span className="p-2 text-xs font-bold text-stone-700 truncate block w-full bg-white border-t border-stone-100">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Editor Drawer/Modal */}
      <AnimatePresence>
        {isCatFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCatFormOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col max-h-[90vh] text-stone-800 border-t border-stone-200"
            >
              <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto my-3"></div>

              <div className="px-5 pb-3 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-extrabold text-stone-900 text-base">
                  {editingCatId ? t('cat.edit_category') : t('cat.add_category')}
                </h3>
                <button
                  onClick={() => setIsCatFormOpen(false)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="cat-name-ua" className="text-xs font-bold text-stone-500">{t('cat.name_ua')}</label>
                  <input
                    id="cat-name-ua"
                    type="text"
                    value={catFormState.nameUa}
                    onChange={(e) => setCatFormState(prev => ({ ...prev, nameUa: e.target.value }))}
                    placeholder={t('cat.name_placeholder')}
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3.5 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="cat-name-en" className="text-xs font-bold text-stone-500">{t('cat.name_en')}</label>
                  <input
                    id="cat-name-en"
                    type="text"
                    value={catFormState.nameEn}
                    onChange={(e) => setCatFormState(prev => ({ ...prev, nameEn: e.target.value }))}
                    placeholder="For example: Sides"
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3.5 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="cat-name-hu" className="text-xs font-bold text-stone-500">{t('cat.name_hu')}</label>
                  <input
                    id="cat-name-hu"
                    type="text"
                    value={catFormState.nameHu}
                    onChange={(e) => setCatFormState(prev => ({ ...prev, nameHu: e.target.value }))}
                    placeholder="Például: Köretek"
                    className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3.5 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="cat-icon-input" className="text-xs font-bold text-stone-500">{t('cat.icon')}</label>
                  <div className="flex gap-2">
                    <input
                      id="cat-icon-input"
                      type="text"
                      value={catFormState.icon}
                      onChange={(e) => setCatFormState(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="🥩"
                      className="bg-stone-50 border border-stone-200 text-sm rounded-xl px-3.5 py-2.5 w-16 text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                      maxLength={2}
                      required
                    />
                    <div className="flex-1 flex gap-2 overflow-x-auto p-1.5 bg-stone-50 border border-stone-200/60 rounded-xl items-center justify-start scrollbar-hide">
                      {['🍕', '🍔', '🥗', '🍰', '🥤', '🥩', '🍝', '🍣', '🍟', '🍜', '🍦', '🍩', '🥨', '☕', '🍺', '🍸'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setCatFormState(prev => ({ ...prev, icon: emoji }))}
                          className="text-xl hover:scale-125 transition-transform shrink-0"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4 pt-4 border-t border-stone-100">
                  <button
                    id="cancel-cat-btn"
                    type="button"
                    onClick={() => setIsCatFormOpen(false)}
                    className="flex-1 bg-white border border-stone-200 text-stone-700 font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all hover:bg-stone-50 active:scale-95"
                  >
                    {t('menu.cancel')}
                  </button>
                  <button
                    id="save-cat-btn"
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    {t('menu.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
