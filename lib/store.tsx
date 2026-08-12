'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase/client';

// ============================================================
// Public types (semantics kept stable so components barely change)
// ============================================================

export interface MenuItem {
  id: string;
  nameUa: string;
  nameEn: string;
  nameHu: string;
  descriptionUa: string;
  descriptionEn: string;
  descriptionHu: string;
  ingredientsUa: string;
  ingredientsEn: string;
  ingredientsHu: string;
  price: number;
  category: string; // Category.id (uuid) or '' when uncategorized
  image: string;
  isAvailable: boolean;
}

export interface Category {
  id: string;
  nameUa: string;
  nameEn: string;
  nameHu: string;
  icon: string;
}

export interface OrderItem {
  menuItemId: string;
  nameUa: string;
  nameEn: string;
  nameHu: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'new' | 'preparing' | 'delivered' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  tableId: string; // table LABEL for display (e.g. '3', 'VIP-1'); '' if none
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string; // ISO
  notes?: string;
}

interface QRMenuContextType {
  menuItems: MenuItem[];
  categories: Category[];
  orders: Order[];
  tables: string[]; // table labels
  language: 'ua' | 'en' | 'hu';
  setLanguage: (lang: 'ua' | 'en' | 'hu') => void;
  // Owner auth (Supabase)
  isOwner: boolean;
  ownerEmail: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
  // Mutations (all async; throw on failure)
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createOrder: (tableId: string, items: OrderItem[], notes?: string) => Promise<string>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addTable: (label: string) => Promise<void>;
  deleteTable: (label: string) => Promise<void>;
  t: (key: string) => string;
}

const QRMenuContext = createContext<QRMenuContextType | undefined>(undefined);

// ============================================================
// DB row types + mappers (snake_case <-> camelCase)
// ============================================================

interface CategoryRow {
  id: string;
  name_ua: string;
  name_en: string;
  name_hu: string;
  icon: string;
}

interface MenuItemRow {
  id: string;
  category_id: string | null;
  name_ua: string;
  name_en: string;
  name_hu: string;
  description_ua: string;
  description_en: string;
  description_hu: string;
  ingredients_ua: string;
  ingredients_en: string;
  ingredients_hu: string;
  price: number;
  image: string;
  is_available: boolean;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_ua: string;
  name_en: string;
  name_hu: string;
  price: number;
  quantity: number;
}

interface OrderRow {
  id: string;
  table_id: string | null;
  status: OrderStatus;
  notes: string | null;
  total_price: number;
  created_at: string;
  order_items: OrderItemRow[];
}

const toCategory = (r: CategoryRow): Category => ({
  id: r.id,
  nameUa: r.name_ua,
  nameEn: r.name_en,
  nameHu: r.name_hu,
  icon: r.icon,
});

const toMenuItem = (r: MenuItemRow): MenuItem => ({
  id: r.id,
  category: r.category_id ?? '',
  nameUa: r.name_ua,
  nameEn: r.name_en,
  nameHu: r.name_hu,
  descriptionUa: r.description_ua,
  descriptionEn: r.description_en,
  descriptionHu: r.description_hu,
  ingredientsUa: r.ingredients_ua,
  ingredientsEn: r.ingredients_en,
  ingredientsHu: r.ingredients_hu,
  price: r.price,
  image: r.image,
  isAvailable: r.is_available,
});

const toOrderItem = (r: OrderItemRow): OrderItem => ({
  menuItemId: r.menu_item_id ?? '',
  nameUa: r.name_ua,
  nameEn: r.name_en,
  nameHu: r.name_hu,
  quantity: r.quantity,
  price: r.price,
});

const toMenuItemPayload = (item: Omit<MenuItem, 'id'> | Partial<MenuItem>) => {
  const p: Record<string, unknown> = {};
  if ('nameUa' in item) p.name_ua = item.nameUa;
  if ('nameEn' in item) p.name_en = item.nameEn;
  if ('nameHu' in item) p.name_hu = item.nameHu;
  if ('descriptionUa' in item) p.description_ua = item.descriptionUa;
  if ('descriptionEn' in item) p.description_en = item.descriptionEn;
  if ('descriptionHu' in item) p.description_hu = item.descriptionHu;
  if ('ingredientsUa' in item) p.ingredients_ua = item.ingredientsUa;
  if ('ingredientsEn' in item) p.ingredients_en = item.ingredientsEn;
  if ('ingredientsHu' in item) p.ingredients_hu = item.ingredientsHu;
  if ('price' in item) p.price = item.price;
  if ('category' in item) p.category_id = item.category || null;
  if ('image' in item) p.image = item.image;
  if ('isAvailable' in item) p.is_available = item.isAvailable;
  return p;
};

const toCategoryPayload = (c: Omit<Category, 'id'> | Partial<Category>) => {
  const p: Record<string, unknown> = {};
  if ('nameUa' in c) p.name_ua = c.nameUa;
  if ('nameEn' in c) p.name_en = c.nameEn;
  if ('nameHu' in c) p.name_hu = c.nameHu;
  if ('icon' in c) p.icon = c.icon;
  return p;
};

const sortTableLabels = (labels: string[]) =>
  [...labels].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

// ============================================================
// Translations
// ============================================================

const TRANSLATIONS: Record<string, { ua: string; en: string; hu?: string }> = {
  'app.name': { ua: 'QR-Меню Кафе', en: 'QR Cafe Menu', hu: 'QR Kávézó Menü' },
  'app.owner_btn': { ua: 'Кабінет власника', en: 'Owner Cabinet', hu: 'Tulajdonosi kabinet' },
  'app.menu_btn': { ua: 'Гостьове меню', en: 'Guest Menu', hu: 'Vendég menü' },
  'app.tagline': { ua: 'Смачні страви, швидке замовлення за лічені секунди', en: 'Delicious dishes, quick order in seconds', hu: 'Finom ételek, gyors rendelés másodpercek alatt' },
  'menu.categories': { ua: 'Категорії', en: 'Categories', hu: 'Kategóriák' },
  'menu.search_placeholder': { ua: 'Пошук страв за назвою або інгредієнтами...', en: 'Search dishes by name or ingredients...', hu: 'Ételek keresése név vagy összetevők alapján...' },
  'menu.all': { ua: 'Всі страви', en: 'All', hu: 'Összes étel' },
  'menu.ingredients': { ua: 'Інгредієнти:', en: 'Ingredients:', hu: 'Összetevők:' },
  'menu.add_to_cart': { ua: 'Додати до замовлення', en: 'Add to Order', hu: 'Rendeléshez ad' },
  'menu.out_of_stock': { ua: 'Тимчасово відсутня', en: 'Temporarily Unavailable', hu: 'Átmenetileg nem elérhető' },
  'menu.not_found': { ua: 'Страви не знайдено за цим запитом', en: 'No dishes found for this search', hu: 'Nincs találat a keresésre' },
  'cart.title': { ua: 'Ваше замовлення', en: 'Your Order', hu: 'Az Ön rendelése' },
  'cart.empty': { ua: 'Кошик порожній. Оберіть страви з нашого меню!', en: 'Your cart is empty. Pick dishes from our menu!', hu: 'A kosár üres. Válasszon ételeket a menüről!' },
  'cart.item_count': { ua: 'страв', en: 'items', hu: 'étel' },
  'cart.table': { ua: 'Стіл №', en: 'Table #', hu: 'Asztal #' },
  'cart.notes': { ua: 'Побажання до замовлення (наприклад, без цибулі):', en: 'Notes to order (e.g., no onions, extra ice):', hu: 'Kérések a rendeléshez (pl. hagyma nélkül):' },
  'cart.checkout_btn': { ua: 'Надіслати замовлення до кухні', en: 'Send Order to Kitchen', hu: 'Rendelés elküldése a konyhára' },
  'cart.total': { ua: 'Всього до сплати:', en: 'Total:', hu: 'Összesen fizetendő:' },
  'cart.success_msg': { ua: 'Замовлення успішно відправлено! Наші кухарі вже чаклують над ним.', en: 'Order sent successfully! Our chefs are already cooking it.', hu: 'A rendelés sikeresen elküldve! A szakácsaink már készítik.' },
  'cart.no_payment_notice': { ua: 'Оплата здійснюється офіціанту при отриманні рахунку.', en: 'Payment is made directly to the waiter upon receiving the bill.', hu: 'A fizetés a pincérnél történik a számla kézhezvételkor.' },

  // Owner Cabinet Login
  'login.title': { ua: 'Вхід до кабінету власника', en: 'Owner Cabinet Login', hu: 'Belépés a tulajdonosi kabinetbe' },
  'login.email': { ua: 'Email', en: 'Email', hu: 'E-mail' },
  'login.password': { ua: 'Пароль', en: 'Password', hu: 'Jelszó' },
  'login.submit': { ua: 'Увійти', en: 'Log In', hu: 'Belépés' },
  'login.invalid': { ua: 'Невірний email або пароль. Спробуйте ще раз.', en: 'Invalid email or password. Please try again.', hu: 'Hibás e-mail vagy jelszó. Próbálja újra.' },

  // Owner Cabinet Dashboard
  'dashboard.title': { ua: 'Панель керування', en: 'Management Panel', hu: 'Vezérlőpult' },
  'dashboard.logout': { ua: 'Вийти', en: 'Log Out', hu: 'Kijelentkezés' },
  'dashboard.change_password': { ua: 'Змінити пароль', en: 'Change Password', hu: 'Jelszó módosítása' },
  'dashboard.new_password': { ua: 'Новий пароль', en: 'New Password', hu: 'Új jelszó' },
  'dashboard.confirm_password': { ua: 'Підтвердіть пароль', en: 'Confirm Password', hu: 'Jelszó megerősítése' },
  'dashboard.password_changed': { ua: 'Пароль успішно змінено.', en: 'Password changed successfully.', hu: 'A jelszó sikeresen megváltoztatva.' },
  'dashboard.passwords_dont_match': { ua: 'Паролі не збігаються.', en: 'Passwords do not match.', hu: 'A jelszavak nem egyeznek.' },
  'dashboard.password_short': { ua: 'Пароль має бути не коротший за 6 символів.', en: 'Password must be at least 6 characters.', hu: 'A jelszónak legalább 6 karakter hosszúnak kell lennie.' },
  'dashboard.password_change_error': { ua: 'Не вдалося змінити пароль. Спробуйте ще раз.', en: 'Failed to change password. Please try again.', hu: 'Nem sikerült módosítani a jelszót. Próbálja újra.' },
  'dashboard.tab_orders': { ua: 'Замовлення', en: 'Orders', hu: 'Rendelések' },
  'dashboard.tab_menu': { ua: 'Меню', en: 'Menu', hu: 'Menü' },
  'dashboard.tab_categories': { ua: 'Категорії', en: 'Categories', hu: 'Kategóriák' },
  'dashboard.tab_tables': { ua: 'Столи та QR коди', en: 'Tables & QR Codes', hu: 'Asztalok és QR-kódok' },

  // Dashboard Orders
  'orders.active_count': { ua: 'Активні замовлення', en: 'Active Orders', hu: 'Aktív rendelések' },
  'orders.no_orders': { ua: 'Немає активних замовлень наразі.', en: 'No active orders at the moment.', hu: 'Jelenleg nincs aktív rendelés.' },
  'orders.table': { ua: 'Стіл', en: 'Table', hu: 'Asztal' },
  'orders.time': { ua: 'Час замовлення', en: 'Order Time', hu: 'Rendelés ideje' },
  'orders.status': { ua: 'Статус', en: 'Status', hu: 'Állapot' },
  'orders.total': { ua: 'Сума', en: 'Total', hu: 'Összeg' },
  'orders.actions': { ua: 'Дії', en: 'Actions', hu: 'Műveletek' },
  'orders.status_new': { ua: 'Нове', en: 'New', hu: 'Új' },
  'orders.status_preparing': { ua: 'Готується', en: 'Preparing', hu: 'Készül' },
  'orders.status_delivered': { ua: 'Подано', en: 'Served', hu: 'Felszolgálva' },
  'orders.status_completed': { ua: 'Завершено', en: 'Completed', hu: 'Befejezve' },
  'orders.status_cancelled': { ua: 'Скасовано', en: 'Cancelled', hu: 'Törölve' },
  'orders.change_status': { ua: 'Змінити статус', en: 'Change Status', hu: 'Állapot módosítása' },
  'orders.delete_confirm': { ua: 'Видалити замовлення з історії?', en: 'Delete order from history?', hu: 'Törli a rendelést az előzményekből?' },
  'orders.notes': { ua: 'Коментар:', en: 'Note:', hu: 'Megjegyzés:' },
  'orders.sound_on': { ua: 'Звук увімкнено', en: 'Sound On', hu: 'Hang be' },
  'orders.sound_off': { ua: 'Звук вимкнено', en: 'Sound Off', hu: 'Hang ki' },
  'orders.invalid_transition': { ua: 'Недопустимий перехід статусу', en: 'Invalid status transition', hu: 'Érvénytelen állapotváltás' },

  // Menu Management
  'menu.add_item': { ua: 'Додати страву', en: 'Add Dish', hu: 'Étel hozzáadása' },
  'menu.edit_item': { ua: 'Редагувати страву', en: 'Edit Dish', hu: 'Étel szerkesztése' },
  'menu.name_ua': { ua: 'Назва (УКР)', en: 'Name (UA)', hu: 'Név (UA)' },
  'menu.name_en': { ua: 'Назва (ENG)', en: 'Name (EN)', hu: 'Név (EN)' },
  'menu.name_hu': { ua: 'Назва (HUN)', en: 'Name (HU)', hu: 'Név (HU)' },
  'menu.desc_ua': { ua: 'Опис (УКР)', en: 'Description (UA)', hu: 'Leírás (UA)' },
  'menu.desc_en': { ua: 'Опис (ENG)', en: 'Description (EN)', hu: 'Leírás (EN)' },
  'menu.desc_hu': { ua: 'Опис (HUN)', en: 'Description (HU)', hu: 'Leírás (HU)' },
  'menu.ingr_ua': { ua: 'Інгредієнти (УКР)', en: 'Ingredients (UA)', hu: 'Összetevők (UA)' },
  'menu.ingr_en': { ua: 'Інгредієнти (ENG)', en: 'Ingredients (EN)', hu: 'Összetevők (EN)' },
  'menu.ingr_hu': { ua: 'Інгредієнти (HUN)', en: 'Ingredients (HU)', hu: 'Összetevők (HU)' },
  'menu.price_label': { ua: 'Ціна (UAH)', en: 'Price (UAH)', hu: 'Ár (UAH)' },
  'menu.category_label': { ua: 'Категорія', en: 'Category', hu: 'Kategória' },
  'menu.image_url': { ua: 'URL Зображення', en: 'Image URL', hu: 'Kép URL' },
  'menu.upload_image': { ua: 'Завантажити власне фото', en: 'Upload Custom Photo', hu: 'Saját kép feltöltése' },
  'menu.drag_and_drop': { ua: 'Перетягніть фото сюди або натисніть, щоб обрати', en: 'Drag & drop a photo here or click to select', hu: 'Húzza ide a képet vagy kattintson a kiválasztáshoz' },
  'menu.image_or': { ua: 'або вкажіть пряме посилання нижче:', en: 'or specify a direct URL below:', hu: 'vagy adja meg a közvetlen URL-t alább:' },
  'menu.compressing': { ua: 'Стиснення та оновлення фото...', en: 'Compressing & optimizing photo...', hu: 'Kép tömörítése és optimalizálása...' },
  'menu.invalid_file': { ua: 'Будь ласка, оберіть коректне зображення (JPEG, PNG, WEBP)', en: 'Please select a valid image (JPEG, PNG, WEBP)', hu: 'Kérjük, válasszon érvényes képet (JPEG, PNG, WEBP)' },
  'menu.available_label': { ua: 'Доступно в меню', en: 'Available in Menu', hu: 'Elérhető a menüben' },
  'menu.save': { ua: 'Зберегти страву', en: 'Save Dish', hu: 'Étel mentése' },
  'menu.cancel': { ua: 'Скасувати', en: 'Cancel', hu: 'Mégse' },
  'menu.delete_item_confirm': { ua: 'Ви впевнені, що хочете видалити цю страву?', en: 'Are you sure you want to delete this dish?', hu: 'Biztosan törölni szeretné ezt az ételt?' },
  'menu.use_preset_img': { ua: 'Обрати фото-шаблон', en: 'Select photo template', hu: 'Képsablon kiválasztása' },
  'menu.price_invalid': { ua: 'Вкажіть коректну ціну (0 або більше)', en: 'Enter a valid price (0 or more)', hu: 'Adjon meg érvényes árat (0 vagy több)' },

  // Categories Management
  'cat.add_category': { ua: 'Додати категорію', en: 'Add Category', hu: 'Kategória hozzáadása' },
  'cat.edit_category': { ua: 'Редагувати категорію', en: 'Edit Category', hu: 'Kategória szerkesztése' },
  'cat.name_ua': { ua: 'Назва категорії (УКР)', en: 'Category Name (UA)', hu: 'Kategória neve (UA)' },
  'cat.name_en': { ua: 'Назва категорії (ENG)', en: 'Category Name (EN)', hu: 'Kategória neve (EN)' },
  'cat.name_hu': { ua: 'Назва категорії (HUN)', en: 'Category Name (HU)', hu: 'Kategória neve (HU)' },
  'cat.icon': { ua: 'Іконка (Емодзі)', en: 'Icon (Emoji)', hu: 'Ikon (Emoji)' },
  'cat.delete_confirm': { ua: 'Видалити категорію? Страви цієї категорії залишаться без категорії.', en: 'Delete category? Dishes in it will become uncategorized.', hu: 'Törli a kategóriát? A benne lévő ételek kategória nélkül maradnak.' },

  // Table Generator & QR
  'tables.title': { ua: 'Генератор QR-кодів для столиків', en: 'QR Code Table Generator', hu: 'QR-kód generátor asztalokhoz' },
  'tables.add_table': { ua: 'Додати столик', en: 'Add Table', hu: 'Asztal hozzáadása' },
  'tables.placeholder': { ua: 'Номер або ім\'я столика (наприклад, 6 або VIP-1)', en: 'Table number or name (e.g., 6 or VIP-1)', hu: 'Asztal száma vagy neve (pl. 6 vagy VIP-1)' },
  'tables.print_title': { ua: 'QR-код для безконтактного замовлення', en: 'QR Code for Touchless Ordering', hu: 'QR-kód az érintésmentes rendeléshez' },
  'tables.print_scan': { ua: 'Відскануйте, щоб відкрити меню', en: 'Scan to open the menu', hu: 'Szkennelje be a menü megnyitásához' },
  'tables.open_menu_simulation': { ua: 'Симулювати сканування (відкрити меню)', en: 'Simulate scanning (open menu)', hu: 'Szkennelés szimulálása (menü megnyitása)' },
  'tables.delete_confirm': { ua: 'Видалити цей столик?', en: 'Delete this table?', hu: 'Törli ezt az asztalt?' },
  'tables.download_qr': { ua: 'Завантажити QR-код', en: 'Download QR Code', hu: 'QR-kód letöltése' },
  'tables.instruction': { ua: 'Роздрукуйте ці QR-коди та розмістіть їх на відповідних столах у кафе. Гості зможуть миттєво перейти до меню, просто навівши камеру свого телефону.', en: 'Print these QR codes and place them on the respective tables. Guests can instantly view the menu by simply pointing their phone camera.', hu: 'Nyomtassa ki ezeket a QR-kódokat és helyezze el a megfelelő asztalokon. A vendégek azonnal megtekinthetik a menüt a telefon kamerájával.' },

  // Common
  'common.save_error': { ua: 'Не вдалося зберегти. Спробуйте ще раз.', en: 'Failed to save. Please try again.', hu: 'Nem sikerült menteni. Próbálja újra.' },
  'common.delete_error': { ua: 'Не вдалося видалити. Спробуйте ще раз.', en: 'Failed to delete. Please try again.', hu: 'Nem sikerült törölni. Próbálja újra.' },
  'common.loading': { ua: 'Завантаження...', en: 'Loading...', hu: 'Betöltés...' },
  'common.rights_reserved': { ua: 'Всі права захищено.', en: 'All rights reserved.', hu: 'Minden jog fenntartva.' },
  'common.great': { ua: 'Чудово!', en: 'Awesome!', hu: 'Remek!' },
  'common.general_table': { ua: 'Загальний', en: 'General', hu: 'Általános' },
  'app.made_with': { ua: 'Зроблено з 💛 для кафе та ресторанів', en: 'Made with 💛 for Cafés & Restaurants', hu: 'Készült 💛-vel kávézóknak és éttermeknek' },

  // Customer menu extras
  'menu.more_details': { ua: 'Детальніше', en: 'Details', hu: 'Részletek' },
  'menu.add': { ua: 'Додати', en: 'Add', hu: 'Hozzáad' },
  'menu.decrease': { ua: 'Зменшити', en: 'Decrease', hu: 'Csökkent' },
  'menu.confirm_qty': { ua: 'Підтвердити', en: 'Confirm', hu: 'Megerősít' },
  'menu.unit': { ua: 'шт', en: 'pc', hu: 'db' },
  'menu.welcome_hello': { ua: 'Вітаємо Вас в', en: 'Welcome to', hu: 'Üdvözöljük a' },
  'menu.welcome_cafe': { ua: 'кафе "Світ кави"', en: '"Svit Kavy" Cafe', hu: '"Svit Kavy" Kávézóban' },
  'menu.welcome_table': { ua: 'Ваш столик', en: 'Your table is', hu: 'Az Ön asztala' },
  'menu.welcome_goodbye': { ua: 'Приємного відпочинку.', en: 'Have a nice rest.', hu: 'Kellemes pihenést kívánunk.' },
  'cart.notes_placeholder': { ua: 'Наприклад: без цибулі, подвійний сир, лід у напій...', en: 'For example: no onion, extra cheese, ice in drink...', hu: 'Például: hagyma nélkül, dupla sajt, jég az italba...' },
  'cart.send_error': { ua: 'Не вдалося надіслати замовлення. Спробуйте ще раз.', en: 'Failed to send order. Please try again.', hu: 'Nem sikerült elküldeni a rendelést. Próbálja újra.' },
  'cart.thanks': { ua: 'Дякуємо за замовлення!', en: 'Thank you for your order!', hu: 'Köszönjük a rendelést!' },

  // Owner cabinet extras
  'dashboard.cash_revenue': { ua: 'Каса (Виконані)', en: 'Revenue (Completed)', hu: 'Bevétel (Teljesítve)' },
  'dashboard.dish_count': { ua: 'Всього страв', en: 'Total Dishes', hu: 'Ételek száma' },
  'dashboard.table_count': { ua: 'Діючі столи', en: 'Active Tables', hu: 'Aktív asztalok' },
  'orders.grand_total': { ua: 'Загалом:', en: 'Total:', hu: 'Összesen:' },
  'orders.delete_title': { ua: 'Видалити з бази', en: 'Delete from history', hu: 'Törlés az előzményekből' },
  'orders.empty_hint': { ua: 'Нові замовлення від гостей з\'являтимуться тут одразу із приємним звуковим сигналом!', en: 'New guest orders will appear here instantly with a pleasant chime!', hu: 'Az új vendégrendelések azonnal megjelennek itt, kellemes csengőhanggal!' },
  'menu.categories_title': { ua: 'Категорії меню', en: 'Menu Categories', hu: 'Menükategóriák' },
  'menu.available_badge': { ua: 'Активна', en: 'Active', hu: 'Aktív' },
  'menu.hidden_badge': { ua: 'Прихована', en: 'Hidden', hu: 'Rejtett' },
  'menu.name_placeholder': { ua: 'Піца Пепероні', en: 'Pizza Pepperoni', hu: 'Pizza Pepperoni' },
  'menu.desc_placeholder': { ua: 'Смачна класична піца з томатами...', en: 'Delicious classic pizza with tomatoes...', hu: 'Finom klasszikus pizza paradicsommal...' },
  'menu.ingr_placeholder': { ua: 'томатний соус, моцарела, базилік', en: 'tomato sauce, mozzarella, basil', hu: 'paradicsomszósz, mozzarella, bazsalikom' },
  'menu.availability_hint': { ua: 'Чи з\'являтиметься страва на екранах гостей', en: 'Whether the dish will appear on guest screens', hu: 'Megjelenjen-e az étel a vendégek képernyőjén' },
  'menu.photo_custom': { ua: 'Власне фото', en: 'Custom Photo', hu: 'Saját kép' },
  'menu.photo_preset': { ua: 'Шаблонне фото', en: 'Template Photo', hu: 'Képsablon' },
  'menu.upload_error': { ua: 'Помилка при завантаженні зображення', en: 'Error uploading image', hu: 'Hiba a kép feltöltésekor' },
  'tables.delete_title': { ua: 'Видалити столик', en: 'Delete table', hu: 'Asztal törlése' },
  'cat.name_placeholder': { ua: 'Наприклад: Гарніри', en: 'e.g. Sides', hu: 'Pl. Köretek' },

  // 404 page
  'nf.title': { ua: '404 — Сторінку не знайдено', en: '404 — Page not found', hu: '404 — Az oldal nem található' },
  'nf.text': { ua: 'Вибачте, але запитувана сторінка не існує або була переміщена.', en: 'Sorry, the page you requested does not exist or has been moved.', hu: 'Sajnáljuk, a kért oldal nem létezik vagy áthelyezték.' },
  'nf.home': { ua: 'На головну', en: 'Go Home', hu: 'Kezdőlap' },
};

// ============================================================
// Provider
// ============================================================

export function QRMenuProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [language, setLanguageState] = useState<'ua' | 'en' | 'hu'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('qr_menu_lang') as 'ua' | 'en' | 'hu';
        if (stored === 'ua' || stored === 'en' || stored === 'hu') return stored;
      } catch {
        /* ignore */
      }
    }
    return 'ua';
  });
  const [isOwner, setIsOwner] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tableUuidByLabel = useRef<Map<string, string>>(new Map());


  const setLanguage = (lang: 'ua' | 'en' | 'hu') => {
    setLanguageState(lang);
    try {
      localStorage.setItem('qr_menu_lang', lang);
    } catch {
      /* ignore */
    }
  };

  // ---- Menu data (public read) ----
  const loadMenuData = async () => {
    try {
      const [catRes, itemRes, tabRes] = await Promise.all([
        supabase.from('categories').select('*').order('position'),
        supabase.from('menu_items').select('*').order('position'),
        supabase.from('tables').select('*'),
      ]);
      if (catRes.error) throw catRes.error;
      if (itemRes.error) throw itemRes.error;
      if (tabRes.error) throw tabRes.error;

      setCategories(catRes.data.map(toCategory));
      setMenuItems(itemRes.data.map(toMenuItem));
      const labelRows = tabRes.data as { id: string; label: string }[];
      tableUuidByLabel.current = new Map(labelRows.map((r) => [r.label, r.id]));
      setTables(sortTableLabels(labelRows.map((r) => r.label)));
    } catch (err) {
      console.error('Failed to load menu data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Orders (owner only; realtime) ----
  const loadOrders = async () => {
    // Tables may not have loaded yet (e.g. session restored before menu fetch);
    // build the label map on demand so order table labels resolve correctly.
    if (tableUuidByLabel.current.size === 0) {
      const { data: tabRows, error: tabErr } = await supabase.from('tables').select('*');
      if (tabErr) {
        console.error('Failed to load tables', tabErr);
      } else {
        const rows = tabRows as { id: string; label: string }[];
        tableUuidByLabel.current = new Map(rows.map((r) => [r.label, r.id]));
      }
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load orders', error);
      return;
    }
    // Reverse the label->uuid map so order rows (which store table_id as uuid)
    // can be displayed with their label.
    const labelByUuid = new Map(
      Array.from(tableUuidByLabel.current.entries()).map(([label, uuid]) => [uuid, label])
    );
    setOrders(
      (data as OrderRow[]).map((row) => ({
        id: row.id,
        tableId: (row.table_id && labelByUuid.get(row.table_id)) ?? '',
        items: (row.order_items ?? []).map(toOrderItem),
        totalPrice: row.total_price,
        status: row.status,
        createdAt: row.created_at,
        notes: row.notes ?? undefined,
      }))
    );
  };

  useEffect(() => {
    // Async data fetch — all setState calls happen after awaits inside
    // loadMenuData, so this is a standard fetch-on-mount effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMenuData();
  }, []);

  // Auth state drives order visibility
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const user = data.session?.user ?? null;
        setIsOwner(!!user);
        setOwnerEmail(user?.email ?? null);
        if (user) loadOrders();
      })
      .catch((err) => console.error('Failed to read session', err));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setIsOwner(!!user);
      setOwnerEmail(user?.email ?? null);
      if (user) {
        loadOrders();
      } else {
        setOrders([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime: refetch orders whenever they change (owner view)
  useEffect(() => {
    if (!isOwner) return;
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, () => loadOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOwner]);

  // ---- Auth ----
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? error.message : null };
  };

  // ---- Menu item mutations ----
  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert(toMenuItemPayload(item))
      .select()
      .single();
    if (error) throw error;
    setMenuItems((prev) => [...prev, toMenuItem(data as MenuItemRow)]);
  };

  const updateMenuItem = async (id: string, item: Partial<MenuItem>) => {
    const { error } = await supabase.from('menu_items').update(toMenuItemPayload(item)).eq('id', id);
    if (error) throw error;
    setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...item } : m)));
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
  };

  // ---- Category mutations ----
  const addCategory = async (category: Omit<Category, 'id'>) => {
    const { data, error } = await supabase
      .from('categories')
      .insert(toCategoryPayload(category))
      .select()
      .single();
    if (error) throw error;
    setCategories((prev) => [...prev, toCategory(data as CategoryRow)]);
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    const { error } = await supabase
      .from('categories')
      .update(toCategoryPayload(category))
      .eq('id', id);
    if (error) throw error;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...category } : c)));
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // ---- Orders ----
  const createOrder = async (tableId: string, items: OrderItem[], notes?: string): Promise<string> => {
    const orderId = newId();
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tableUuid = tableUuidByLabel.current.get(tableId) ?? null;

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      table_id: tableUuid,
      status: 'new',
      notes: notes?.trim() ? notes : null,
      total_price: totalPrice,
    });
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map((i) => ({
        order_id: orderId,
        menu_item_id: i.menuItemId || null,
        name_ua: i.nameUa,
        name_en: i.nameEn,
        name_hu: i.nameHu,
        price: i.price,
        quantity: i.quantity,
      }))
    );
    if (itemsError) throw itemsError;

    setOrders((prev) => [
      {
        id: orderId,
        tableId,
        items,
        totalPrice,
        status: 'new',
        createdAt: new Date().toISOString(),
        notes: notes?.trim() ? notes : undefined,
      },
      ...prev,
    ]);
    return orderId;
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // ---- Tables ----
  const addTable = async (label: string) => {
    const clean = label.trim();
    if (!clean || tables.includes(clean)) return;
    const { data, error } = await supabase
      .from('tables')
      .insert({ label: clean })
      .select()
      .single();
    if (error) throw error;
    const row = data as { id: string; label: string };
    tableUuidByLabel.current.set(row.label, row.id);
    setTables((prev) => sortTableLabels([...prev, row.label]));
  };

  const deleteTable = async (label: string) => {
    const { error } = await supabase.from('tables').delete().eq('label', label);
    if (error) throw error;
    tableUuidByLabel.current.delete(label);
    setTables((prev) => prev.filter((t) => t !== label));
  };

  // ---- Translation helper ----
  const t = (key: string): string => {
    const translation = TRANSLATIONS[key];
    if (!translation) return key;
    return translation[language] || translation['en'] || translation['ua'] || key;
  };

  return (
    <QRMenuContext.Provider
      value={{
        menuItems,
        categories,
        orders,
        tables,
        language,
        setLanguage,
        isOwner,
        ownerEmail,
        isLoading,
        signIn,
        signOut,
        changePassword,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addCategory,
        updateCategory,
        deleteCategory,
        createOrder,
        updateOrderStatus,
        deleteOrder,
        addTable,
        deleteTable,
        t,
      }}
    >
      {children}
    </QRMenuContext.Provider>
  );
}

export function useQRMenu() {
  const context = useContext(QRMenuContext);
  if (context === undefined) {
    throw new Error('useQRMenu must be used within a QRMenuProvider');
  }
  return context;
}
