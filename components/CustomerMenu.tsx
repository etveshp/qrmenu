'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQRMenu, MenuItem, OrderItem } from '../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Utensils,
  Coffee,
  ChevronLeft,
  AlertTriangle,
  Trash2
} from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80';

type FlyingItem = {
  key: number;
  img: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export default function CustomerMenu() {
  const { 
    menuItems, 
    categories, 
    createOrder,    language,
    isLoading,
    t,
    notify,
    cafePhotoUrl,
    cafeNames,
    cafeDescriptions,
    cafeHours
  } = useQRMenu();

  const [selectedTable, setSelectedTable] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('table') || '';
    }
    return '';
  });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<Record<string, number>>({});
  // Per-dish quantity being prepared on the card stepper — NOT in the cart yet;
  // only the round "+" button commits it to the cart.
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  const [expandedDishes, setExpandedDishes] = useState<Record<string, boolean>>({});
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [lastOrderId, setLastOrderId] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [landingPulse, setLandingPulse] = useState<{ key: number; x: number; y: number } | null>(null);
  const flyIdRef = useRef(0);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  // Miniature dish copy size: rectangular, like the original card photo.
  const FLY_W = 64;
  const FLY_H = 40;

  // Chime played when an item is added to the cart — same two-note sound
  // (C5 → E5) the owner hears when a new order arrives.
  const playAddChime = () => {
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Note 1: C5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Note 2: E5
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.error('Audio synthesis error:', e);
    }
  };

  // Launches a miniature copy of the dish photo from its card to the cart bar.
  const flyToCart = (dish: MenuItem) => {
    const cardImg = document.querySelector(`#dish-card-${dish.id} img`);
    const srcRect = cardImg?.getBoundingClientRect();
    if (!srcRect) return;
    const bar = document.getElementById('cart-trigger-btn');
    let endX: number;
    let endY: number;
    if (bar) {
      const r = bar.getBoundingClientRect();
      endX = r.left + r.width / 2 - FLY_W / 2;
      endY = r.top + r.height / 2 - FLY_H / 2;
    } else {
      // Bar is not visible yet (first item): fly to where it will appear.
      endX = window.innerWidth / 2 - FLY_W / 2;
      endY = window.innerHeight - 44 - FLY_H / 2;
    }
    const key = ++flyIdRef.current;
    setFlyingItems(prev => [
      ...prev,
      {
        key,
        img: dish.image || FALLBACK_IMG,
        startX: srcRect.left + srcRect.width / 2 - FLY_W / 2,
        startY: srcRect.top + srcRect.height / 2 - FLY_H / 2,
        endX,
        endY,
      },
    ]);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Filter items: category view filters within the category; on the home
  // screen a non-empty search shows cross-category results.
  const matchesQuery = (item: MenuItem) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    const name = language === 'ua' ? item.nameUa.toLowerCase() : item.nameEn.toLowerCase();
    const desc = language === 'ua' ? item.descriptionUa.toLowerCase() : item.descriptionEn.toLowerCase();
    const ingr = language === 'ua' ? item.ingredientsUa.toLowerCase() : item.ingredientsEn.toLowerCase();
    return name.includes(query) || desc.includes(query) || ingr.includes(query);
  };

  const inCategoryView = activeCategory !== null;
  const activeCat = activeCategory ? (categories.find((c) => c.id === activeCategory) ?? null) : null;
  const filteredItems = inCategoryView
    ? menuItems.filter((i) => i.category === activeCategory && matchesQuery(i))
    : searchQuery
      ? menuItems.filter(matchesQuery)
      : [];

  // Cart operations
  const addToCart = (id: string) => {
    const dish = menuItems.find(m => m.id === id);
    if (!dish || !dish.isAvailable) return;

    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return {
        ...prev,
        [id]: current - 1,
      };
    });
  };

  const removeItemFromCart = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const cartTotal = Object.entries(cart).reduce((total, [itemId, quantity]) => {
    const item = menuItems.find((m) => m.id === itemId);
    return total + (item ? item.price * quantity : 0);
  }, 0);

  const toggleExpand = (id: string) => {
    setExpandedDishes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Submit Order
  const handlePlaceOrder = async () => {
    if (totalCartItems === 0) return;

    // Use selectedTable if specified, otherwise default to generic order target
    const finalTable = selectedTable || t('common.general_table');

    const orderItems: OrderItem[] = Object.entries(cart).map(([itemId, quantity]) => {
      const item = menuItems.find((m) => m.id === itemId)!;
      return {
        menuItemId: item.id,
        nameUa: item.nameUa,
        nameEn: item.nameEn,
        nameHu: item.nameHu || item.nameEn || item.nameUa,
        quantity,
        price: item.price,
      };
    });

    try {
      const newId = await createOrder(finalTable, orderItems, orderNotes);
      setLastOrderId(newId);
      setOrderSuccess(true);
      setCart({});
      setPendingQty({});
      setOrderNotes('');
      setIsCartOpen(false);
    } catch (err) {
      console.error('Failed to place order', err);
      // Simple, visible fallback until a toast system exists
      notify(t('cart.send_error'));
    }
  };

  // Working hours badge: today's hours from the café settings (default if unset)
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayHoursRaw = cafeHours[DAY_KEYS[new Date().getDay()]];
  const DEFAULT_HOURS = '09:00 - 22:00';
  const todayHours =
    todayHoursRaw === undefined
      ? DEFAULT_HOURS
      : todayHoursRaw || t('menu.closed_today');

  if (isLoading && menuItems.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-stone-50 min-h-screen flex items-center justify-center text-stone-400 text-sm font-semibold">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div id="customer-menu-container" className="w-full max-w-md mx-auto bg-stone-50 min-h-screen shadow-lg flex flex-col relative text-stone-800 pb-20">
      
      {/* Banner / Header */}
      <header id="customer-header" className="relative h-60 bg-cover bg-center flex flex-col justify-end p-4 text-white rounded-b-2xl overflow-hidden shadow-md" style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.65) 32%, rgba(0,0,0,0) 55%), url('${cafePhotoUrl || DEFAULT_BANNER}')` }}>
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Clock size={12} />
            <span>{todayHours}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <h1 id="customer-restaurant-name" className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Utensils className="text-amber-500" size={24} />
            {cafeNames[language] || cafeNames.ua || t('app.name')}
          </h1>
          <p className="text-stone-300 text-xs font-medium">
            {cafeDescriptions[language] || cafeDescriptions.ua || t('app.tagline')}
          </p>
        </div>
      </header>

      {/* Welcome Panel under banner */}
      {showWelcome && (
        <div 
          id="welcome-panel" 
          className="bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-stone-50/60 mx-4 mt-3 rounded-2xl shadow-sm py-3 px-3.5 flex items-center gap-3 border border-amber-200/60 z-10 relative animate-fade-in"
        >
          {/* Accent badge/icon */}
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-200/60 flex items-center justify-center text-amber-800 flex-shrink-0 shadow-sm">
            <Coffee size={15} className="animate-pulse" />
          </div>
          
          <div className="flex-1 min-w-0 pr-6 text-left">
            <p className="text-xs font-semibold text-stone-800 leading-relaxed">
              <span className="block">
                {t('menu.welcome_hello')} <span className="font-extrabold text-amber-900 drop-shadow-sm">{cafeNames[language] || cafeNames.ua || t('app.name')}</span>!
              </span>
              <span className="block">
                {selectedTable ? (
                  <>
                    {t('menu.welcome_table')} <span className="inline-block bg-amber-200/70 text-amber-950 text-xs font-black px-1.5 py-0.5 rounded-md border border-amber-300/40 font-sans shadow-sm">{selectedTable}</span>.{' '}
                  </>
                ) : null}
                {t('menu.welcome_goodbye')}
              </span>
            </p>
          </div>

          {/* Close button */}
          <button
            id="close-welcome-btn"
            type="button"
            onClick={() => setShowWelcome(false)}
            className="absolute top-2 right-2 text-amber-800/60 hover:text-amber-900 hover:bg-amber-100/50 transition-all p-1.5 rounded-full flex items-center justify-center"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main Content Areas */}
      <main id="customer-main-content" className="flex-1 p-4 flex flex-col gap-5">
        
        {/* Search */}
        <div id="customer-search-wrapper" className="relative">
          <input
            id="customer-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('menu.search_placeholder')}
            className="w-full bg-white pl-10 pr-4 py-3 rounded-xl border border-stone-200 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
          />
          <Search className="absolute left-3.5 top-3.5 text-stone-400" size={16} />
          {searchQuery && (
            <button 
              id="customer-search-clear"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category navigation: tiles grid on home, header inside a category */}
        {inCategoryView ? (
          <div id="category-header" className="flex items-center gap-2">
            <button
              id="back-to-categories-btn"
              onClick={() => {
                setActiveCategory(null);
                setSearchQuery('');
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-stone-200/60 shadow-sm text-stone-700 hover:bg-stone-100 text-xs font-bold transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
              {t('menu.categories')}
            </button>
            {activeCat && (
              <span className="text-sm font-extrabold text-stone-800 truncate flex items-center gap-1.5">
                <span>{activeCat.icon}</span>
                <span>{language === 'ua' ? activeCat.nameUa : language === 'hu' ? (activeCat.nameHu || activeCat.nameEn || activeCat.nameUa) : activeCat.nameEn}</span>
              </span>
            )}
          </div>
        ) : (
          <div id="customer-categories-grid" className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const cover =
                menuItems.find((i) => i.category === cat.id && i.image)?.image ||
                FALLBACK_IMG;
              return (
                <button
                  key={cat.id}
                  id={`cat-tile-${cat.id}`}
                  onClick={() => setActiveCategory(cat.id)}
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-stone-200/60 text-left group active:scale-[0.98] transition-transform"
                >
                  <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <span className="absolute bottom-2 left-2.5 right-2.5 text-white font-semibold text-sm leading-tight drop-shadow">
                    {language === 'ua' ? cat.nameUa : language === 'hu' ? (cat.nameHu || cat.nameEn || cat.nameUa) : cat.nameEn}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Dishes List (category view or search results) */}
        {(inCategoryView || searchQuery) && (
        <div id="dishes-list" className="flex flex-col gap-4">
          {filteredItems.length > 0 ? (
            filteredItems.map((dish) => {
              const countInCart = cart[dish.id] || 0;
              const pending = pendingQty[dish.id] || 0;
              // Stepper shows what is already ordered plus the amount being selected,
              // so after adding, the chosen quantity stays visible instead of resetting to 0.
              const stepperValue = countInCart + pending;
              const isExpanded = !!expandedDishes[dish.id];
              const dishName = language === 'ua' ? dish.nameUa : language === 'hu' ? (dish.nameHu || dish.nameEn || dish.nameUa) : dish.nameEn;
              const dishDesc = language === 'ua' ? dish.descriptionUa : language === 'hu' ? (dish.descriptionHu || dish.descriptionEn || dish.descriptionUa) : dish.descriptionEn;
              const dishIngr = language === 'ua' ? dish.ingredientsUa : language === 'hu' ? (dish.ingredientsHu || dish.ingredientsEn || dish.ingredientsUa) : dish.ingredientsEn;

              return (
                <div 
                  key={dish.id} 
                  id={`dish-card-${dish.id}`}
                  className={`bg-white rounded-xl border border-stone-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${
                    !dish.isAvailable ? 'opacity-70' : ''
                  }`}
                >
                  <div className="relative h-44 bg-stone-100">
                    <img 
                      src={dish.image || FALLBACK_IMG} 
                      alt={dishName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {!dish.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
                        <span className="bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-full tracking-wide uppercase shadow">
                          {t('menu.out_of_stock')}
                        </span>
                      </div>
                    )}
                    {dish.isAvailable && countInCart > 0 && (
                      <div className="absolute top-3 left-3 bg-amber-600 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-scale">
                        {countInCart}
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-extrabold text-stone-900 text-base leading-tight">
                        {dishName}
                      </h3>
                      <span className="text-amber-700 font-black text-lg whitespace-nowrap">
                        {dish.price} ₴
                      </span>
                    </div>

                    <p className={`text-stone-500 text-xs leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {dishDesc}
                    </p>

                    {/* Expandable details: ingredients */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-1 pt-2 border-t border-stone-100 flex flex-col gap-2"
                        >
                          <div className="flex flex-col gap-1 bg-stone-50 p-2.5 rounded-lg text-xs leading-relaxed">
                            <span className="font-extrabold text-stone-700 flex items-center gap-1 text-xs uppercase tracking-wide">
                              <Info size={12} className="text-amber-600" />
                              {t('menu.ingredients')}
                            </span>
                            <span className="text-stone-600 font-medium">{dishIngr}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Cart Controller or Add Button */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-100/60">
                      <button
                        type="button"
                        onClick={() => toggleExpand(dish.id)}
                        className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50/40 active:bg-amber-100/40 border border-amber-500 text-xs font-bold px-3.5 h-10 rounded-xl transition-all"
                        title={t('menu.more_details')}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        <span>{t('menu.more_details')}</span>
                      </button>

                      {dish.isAvailable ? (
                        <div id={`cart-control-wrapper-${dish.id}`} className="flex items-center gap-3.5 select-none">
                          {/* Quantity stepper — selects the amount only, defaults to 0; does NOT touch the cart.
                              It always shows how many are already in the cart (+ the new selection). */}
                          <div className="flex items-center bg-white border border-stone-200 rounded-full shadow-sm h-10 px-1 overflow-hidden">
                            <button
                              id={`remove-btn-${dish.id}`}
                              type="button"
                              onClick={() => setPendingQty(prev => ({ ...prev, [dish.id]: Math.max(0, (prev[dish.id] || 0) - 1) }))}
                              className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100/50 rounded-full transition-all cursor-pointer"
                              title={t('menu.decrease')}
                            >
                              <Minus size={16} className="stroke-[2.5]" />
                            </button>
                            <span
                              id={`qty-${dish.id}`}
                              data-testid={`qty-${dish.id}`}
                              className="text-sm font-black text-stone-800 text-center min-w-6 tabular-nums"
                            >
                              {stepperValue}
                            </span>
                            <button
                              id={`add-qty-${dish.id}`}
                              type="button"
                              onClick={() => setPendingQty(prev => ({ ...prev, [dish.id]: Math.min(99, (prev[dish.id] || 0) + 1) }))}
                              className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100/50 rounded-full transition-all cursor-pointer"
                              title={t('menu.add')}
                            >
                              <Plus size={16} className="stroke-[2.5]" />
                            </button>
                          </div>
                          {/* The round "+" is the only control that adds to the cart */}
                          <button
                            id={`add-btn-${dish.id}`}
                            type="button"
                            onClick={() => {
                              if (pending === 0) {
                                showToast(t('menu.choose_qty_first'));
                                return;
                              }
                              setCart(prev => ({ ...prev, [dish.id]: (prev[dish.id] || 0) + pending }));
                              // Pending resets to 0; the stepper now reflects the cart amount
                              // (countInCart + 0), so the ordered quantity stays visible on the card.
                              setPendingQty(prev => ({ ...prev, [dish.id]: 0 }));
                              flyToCart(dish);
                              playAddChime();
                            }}
                            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center text-white cursor-pointer shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
                            title={t('menu.add_to_cart')}
                          >
                            <Plus size={18} className="stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-stone-400 text-xs font-semibold italic">
                          {t('menu.out_of_stock')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 px-4 flex flex-col items-center justify-center bg-white rounded-2xl border border-stone-200/50">
              <Search size={32} className="text-stone-300 mb-2" />
              <p className="text-stone-500 text-sm font-semibold">
                {t('menu.not_found')}
              </p>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Persistent Shopping Cart Trigger Button */}
      {totalCartItems > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
          <button
            id="cart-trigger-btn"
            onClick={() => {
              setOrderSuccess(false);
              setIsCartOpen(true);
            }}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 px-6 rounded-2xl shadow-xl hover:shadow-amber-200 flex items-center justify-between transition-all active:scale-95 border border-amber-500/30"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart size={20} />
                <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-amber-600 shadow-sm">
                  {totalCartItems}
                </span>
              </div>
              <span className="text-xs uppercase tracking-wider font-extrabold pl-1">
                {t('cart.title')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">{cartTotal} ₴</span>
            </div>
          </button>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-md pointer-events-none"
          >
            <div className="mx-auto w-fit max-w-full bg-stone-900/95 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span className="truncate">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fly-to-cart animation: the card visibly shrinks, arcs up and falls into the cart bar */}
      <AnimatePresence>
        {flyingItems.map((f) => {
          const dx = f.endX - f.startX;
          const dy = f.endY - f.startY;
          const apexY = Math.min(0, dy) - 90;
          return (
            <motion.div
              key={f.key}
              className="fixed z-50 pointer-events-none"
              style={{ left: f.startX, top: f.startY, width: FLY_W, height: FLY_H }}
              initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
              animate={{
                x: dx,
                // Rise up first, then accelerate down into the cart (gravity arc)
                y: [0, apexY, dy],
                scale: [1, 0.55, 0.3],
                rotate: [0, -10, 6, 0],
                opacity: [1, 1, 0.85],
              }}
              transition={{
                duration: 0.85,
                x: { duration: 0.85, ease: [0.3, 0.7, 0.2, 1] },
                y: { duration: 0.85, times: [0, 0.5, 1], ease: ['easeOut', 'easeIn'] },
                scale: { duration: 0.85, times: [0, 0.5, 1], ease: ['easeIn', 'easeOut'] },
                rotate: { duration: 0.85, times: [0, 0.35, 0.7, 1], ease: 'easeInOut' },
                opacity: { duration: 0.85, times: [0, 0.8, 1], ease: 'easeInOut' },
              }}
              onAnimationComplete={() => {
                setFlyingItems(prev => prev.filter(item => item.key !== f.key));
                // Ring pulse where the card lands on the cart bar
                setLandingPulse({ key: f.key, x: f.endX + FLY_W / 2, y: f.endY + FLY_H / 2 });
              }}
            >
              <img
                src={f.img}
                alt=""
                aria-hidden="true"
                className="w-full h-full rounded-lg object-cover shadow-lg border border-stone-200/70"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Landing splash: expanding ring at the cart bar */}
      {landingPulse && (
        <motion.div
          key={landingPulse.key}
          className="fixed z-40 pointer-events-none w-12 h-12 rounded-full border-2 border-amber-500/80"
          style={{ left: landingPulse.x - 24, top: landingPulse.y - 24 }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          onAnimationComplete={() => setLandingPulse(null)}
        />
      )}

      {/* Cart Drawer Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black z-30 max-w-md mx-auto"
            />
            
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl shadow-2xl z-40 flex flex-col max-h-[85vh] border-t border-stone-200"
            >
              {/* Handle */}
              <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto my-3"></div>

              {/* Header */}
              <div className="px-5 pb-3 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-amber-600" size={20} />
                  <h3 className="font-extrabold text-stone-900 text-lg">
                    {t('cart.title')}
                  </h3>
                </div>
                <button
                  id="close-cart-btn"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                
                {/* Table display (Only displays if specific table is scanned) */}
                {selectedTable && (
                  <div className="flex items-center justify-between bg-stone-50 border border-stone-200/50 p-3 rounded-xl text-sm font-semibold text-stone-700">
                    <span>{t('cart.table')}</span>
                    <span className="bg-amber-100 text-amber-800 font-extrabold px-3 py-1 rounded-lg">
                      {selectedTable}
                    </span>
                  </div>
                )}

                {/* Items */}
                <div className="flex flex-col gap-3">
                  {Object.entries(cart).map(([itemId, quantity]) => {
                    const dish = menuItems.find(m => m.id === itemId);
                    if (!dish) return null;
                    const dishName = language === 'ua' ? dish.nameUa : language === 'hu' ? (dish.nameHu || dish.nameEn || dish.nameUa) : dish.nameEn;

                    return (
                      <div key={itemId} className="flex items-start gap-3 py-2.5 border-b border-stone-100 last:border-b-0">
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-stone-100 shrink-0 border border-stone-200/60">
                          <img 
                            src={dish.image || FALLBACK_IMG} 
                            alt={dishName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                          {/* Row 1: full-width name (up to 2 lines) + delete on the right edge */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-stone-900 text-sm leading-tight line-clamp-2 min-w-0">{dishName}</span>
                            <button
                              id={`remove-item-btn-${itemId}`}
                              type="button"
                              onClick={() => removeItemFromCart(itemId)}
                              title={t('cart.remove_item')}
                              className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-md transition-colors shrink-0 -mt-0.5 -mr-0.5"
                            >
                            <Trash2 size={16} />
                          </button>
                          </div>
                          {/* Row 2: unit price left, stepper + subtotal right */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-stone-500 text-sm font-semibold">{dish.price} ₴</span>
                            <div className="flex items-center gap-3.5 shrink-0">
                              <div className="flex items-center bg-stone-50 border border-stone-200 rounded-lg p-0.5">
                                <button
                                  onClick={() => removeFromCart(itemId)}
                                  className="w-7 h-7 flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-md transition-colors"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="px-2.5 text-xs font-bold text-stone-800">{quantity}</span>
                                <button
                                  onClick={() => addToCart(itemId)}
                                  className="w-7 h-7 flex items-center justify-center text-stone-500 hover:bg-stone-200 rounded-md transition-colors"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <span className="font-extrabold text-stone-800 text-base min-w-20 text-right whitespace-nowrap tabular-nums">
                                {dish.price * quantity} ₴
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Special instructions */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <label htmlFor="cart-notes-area" className="text-xs font-bold text-stone-500">
                    {t('cart.notes')}
                  </label>
                  <textarea
                    id="cart-notes-area"
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder={t('cart.notes_placeholder')}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Total & Action */}
              <div className="p-5 border-t border-stone-100 bg-stone-50 flex flex-col gap-3 rounded-b-2xl">
                <div className="flex justify-between items-center text-stone-900 font-extrabold text-base">
                  <span>{t('cart.total')}</span>
                  <span className="text-xl text-amber-700">{cartTotal} ₴</span>
                </div>
                
                <p className="text-xs text-stone-400 font-medium text-center leading-relaxed flex items-center justify-center gap-1">
                  <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                  <span>{t('cart.no_payment_notice')}</span>
                </p>

                <button
                  id="checkout-submit-btn"
                  onClick={handlePlaceOrder}
                  disabled={totalCartItems === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  {t('cart.checkout_btn')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 max-w-md mx-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center max-w-xs"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
                <Check size={36} className="stroke-[3]" />
              </div>
              <h4 className="font-extrabold text-stone-900 text-lg mb-2">
                {t('cart.thanks')}
              </h4>
              <p className="text-stone-500 text-xs leading-relaxed mb-4">
                {t('cart.success_msg')}
              </p>
              <div className="bg-stone-50 px-4 py-2 rounded-lg border border-stone-100 text-xs text-stone-500 font-semibold mb-5 uppercase tracking-wider">
                ID: {lastOrderId.slice(0, 8).toUpperCase()}
              </div>
              <button
                id="success-ok-btn"
                onClick={() => setOrderSuccess(false)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow transition-transform active:scale-95"
              >
                {t('common.great')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
