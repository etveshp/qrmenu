'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Types definition
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
  category: string; // matches Category.id
  image: string;
  isAvailable: boolean;
}

export interface Category {
  id: string;
  nameUa: string;
  nameEn: string;
  nameHu: string;
  icon: string; // Emoji or Lucide icon key
}

export interface OrderItem {
  menuItemId: string;
  nameUa: string;
  nameEn: string;
  nameHu: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  totalPrice: number;
  status: 'new' | 'preparing' | 'delivered' | 'completed' | 'cancelled';
  createdAt: string; // ISO String
  notes?: string;
}

interface QRMenuContextType {
  menuItems: MenuItem[];
  categories: Category[];
  orders: Order[];
  tables: string[];
  language: 'ua' | 'en' | 'hu';
  setLanguage: (lang: 'ua' | 'en' | 'hu') => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  createOrder: (tableId: string, items: OrderItem[], notes?: string) => string;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  deleteOrder: (id: string) => void;
  addTable: (tableId: string) => void;
  deleteTable: (tableId: string) => void;
  t: (key: string) => string;
}

const QRMenuContext = createContext<QRMenuContextType | undefined>(undefined);

// Initial Categories
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-pizza', nameUa: 'Піца', nameEn: 'Pizza', nameHu: 'Pizza', icon: '🍕' },
  { id: 'cat-burgers', nameUa: 'Бургери', nameEn: 'Burgers', nameHu: 'Burgerek', icon: '🍔' },
  { id: 'cat-soups', nameUa: 'Супи та Салати', nameEn: 'Soups & Salads', nameHu: 'Levesek és Saláták', icon: '🥗' },
  { id: 'cat-desserts', nameUa: 'Десерти', nameEn: 'Desserts', nameHu: 'Desszertek', icon: '🍰' },
  { id: 'cat-drinks', nameUa: 'Напої', nameEn: 'Drinks', nameHu: 'Italok', icon: '🥤' },
];

// Initial Menu Items with high-quality Food photos
const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'dish-1',
    nameUa: 'Піца Маргарита',
    nameEn: 'Pizza Margherita',
    nameHu: 'Pizza Margherita',
    descriptionUa: 'Класична італійська піца зі стиглими томатами, ніжною моцарелою та свіжим зеленим базиліком.',
    descriptionEn: 'Classic Italian pizza with ripe tomatoes, tender mozzarella, and fresh green basil.',
    descriptionHu: 'Klasszikus olasz pizza érett paradicsommal, lágy mozzarellával és friss zöld bazsalikommal.',
    ingredientsUa: 'Томатний соус, сир моцарела, свіжий базилік, оливкова олія',
    ingredientsEn: 'Tomato sauce, mozzarella cheese, fresh basil, olive oil',
    ingredientsHu: 'Paradicsomszósz, mozzarella sajt, friss bazsalikom, olívaolaj',
    price: 195,
    category: 'cat-pizza',
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80',
    isAvailable: true,
  },
  {
    id: 'dish-2',
    nameUa: 'Бургер Фірмовий з беконом',
    nameEn: 'Signature Bacon Burger',
    nameHu: 'Különleges baconös burger',
    descriptionUa: 'Соковита котлета зі 100% яловичини на грилі, сир чеддер, хрусткий підсмажений бекон, томати, солодкий маринований огірок та наш унікальний соус.',
    descriptionEn: 'Juicy 100% grilled beef patty, cheddar cheese, crispy toasted bacon, tomatoes, sweet pickles, and our unique sauce.',
    descriptionHu: 'Lédús, 100% grillezett marhahúspogácsa, cheddar sajt, ropogós sült bacon, paradicsom, édes csemegeuborka és egyedi szószunk.',
    ingredientsUa: 'Булочка бріош, яловича котлета, сир чеддер, бекон, листя салату, томати, маринований огірок, фірмовий соус BBQ',
    ingredientsEn: 'Brioche bun, beef patty, cheddar cheese, bacon, lettuce, tomatoes, pickles, signature BBQ sauce',
    ingredientsHu: 'Brioche zsemle, marhahúspogácsa, cheddar sajt, bacon, saláta, paradicsom, savanyú uborka, különleges BBQ szósz',
    price: 245,
    category: 'cat-burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
    isAvailable: true,
  },
  {
    id: 'dish-3',
    nameUa: 'Салат Цезар з куркою',
    nameEn: 'Caesar Salad with Chicken',
    nameHu: 'Cézár saláta csirkehússal',
    descriptionUa: 'Хрустке свіже листя ромену, соковите філе курячої грудки су-від гриль, витриманий пармезан, часникові пшеничні грінки та легендарний соус Цезар з анчоусами.',
    descriptionEn: 'Crisp fresh romaine lettuce, juicy sous-vide grilled chicken breast, aged parmesan cheese, garlic wheat croutons, and legendary Caesar dressing with anthovies.',
    descriptionHu: 'Ropogós, friss római saláta, lédús grillezett csirkemell filé, érlelt parmezán sajt, fokhagymás kruton és a legendás Cézár öntet szardellával.',
    ingredientsUa: 'Салат ромен, куряче філе гриль, пармезан, пшеничні грінки, соус цезар, томати черрі',
    ingredientsEn: 'Romaine lettuce, grilled chicken breast, parmesan, wheat croutons, caesar dressing, cherry tomatoes',
    ingredientsHu: 'Római saláta, grillezett csirkemell, parmezán, kruton, cézár öntet, koktélparadicsom',
    price: 180,
    category: 'cat-soups',
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=500&q=80',
    isAvailable: true,
  },
  {
    id: 'dish-4',
    nameUa: 'Томатний крем-суп з базиліком',
    nameEn: 'Tomato Cream Soup with Basil',
    nameHu: 'Paradicsom krémleves bazsalikommal',
    descriptionUa: 'Оксамитовий гарячий суп із запечених італійських томатів вершків, приправлений орегано та свіжим базиліковим песто, подається з хрусткими крутонами.',
    descriptionEn: 'Velvety hot soup made of roasted Italian plum tomatoes, seasoned with oregano and fresh basil pesto, served with crispy croutons.',
    descriptionHu: 'Bársonyos, meleg leves sült olasz paradicsomból és tejszínből, oregánóval és friss bazsalikom pesztóval ízesítve, ropogós krutonnal tálalva.',
    ingredientsUa: 'Стиглі томати, вершки, часник, цибуля, базилік, оливкова олія, пшеничні грінки',
    ingredientsEn: 'Ripe tomatoes, cream, garlic, onions, basil, olive oil, wheat croutons',
    ingredientsHu: 'Érett paradicsom, tejszín, fokhagyma, hagyma, bazsalikom, olívaolaj, kruton',
    price: 150,
    category: 'cat-soups',
    image: 'https://images.unsplash.com/photo-1547592165-e1d17fed6006?auto=format&fit=crop&w=500&q=80',
    isAvailable: true,
  },
  {
    id: 'dish-5',
    nameUa: 'Чізкейк Нью-Йорк з малиною',
    nameEn: 'New York Cheesecake with Raspberry',
    nameHu: 'New York sajttorta málnával',
    descriptionUa: 'Легендарний ніжний вершково-сирний торт на тонкому пісочному коржі, прикрашений ароматним натуральним малиновим соусом кулі.',
    descriptionEn: 'Legendary delicate cream cheese cake on a thin shortbread crust, topped with fragrant natural raspberry coulis sauce.',
    descriptionHu: 'Legendás, finom krémsajttorta vékony omlós tésztán, illatos természetes málnaöntettel a tetején.',
    ingredientsUa: 'Вершковий сир, пісочне тісто, цукор, натуральні вершки, малина, лимонна цедра',
    ingredientsEn: 'Cream cheese, shortbread crust, sugar, natural cream, raspberry, lemon zest',
    ingredientsHu: 'Krémsajt, omlós tészta, cukor, tejszín, málna, citromhéj',
    price: 110,
    category: 'cat-desserts',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80',
    isAvailable: true,
  },
  {
    id: 'dish-6',
    nameUa: 'Капучино Класичний',
    nameEn: 'Classic Cappuccino',
    nameHu: 'Klasszikus cappuccino',
    descriptionUa: 'Збалансований кавовий напій на основі подвійного еспресо зі свіжообсмаженої арабіки та ніжної пишної молочної піни.',
    descriptionEn: 'Balanced coffee drink based on a double shot of freshly roasted Arabica espresso and delicate rich frothed milk.',
    descriptionHu: 'Kiegyensúlyozott kávéital frissen pörkölt Arabica eszpresszó és finom, dús tejhab alapján.',
    ingredientsUa: 'Кава арабіка, незбиране молоко',
    ingredientsEn: 'Arabica coffee, whole milk',
    ingredientsHu: 'Arabica kávé, teljes tej',
    price: 65,
    category: 'cat-drinks',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=80',
    isAvailable: true,
  },
  {
    id: 'dish-7',
    nameUa: 'Цитрусовий Лимонад',
    nameEn: 'Citrus Lemonade',
    nameHu: 'Citrusos limonádé',
    descriptionUa: 'Освіжаючий авторський напій на основі натурального фрешу лимона, апельсина, грейпфрута та свіжого листя м\'яти.',
    descriptionEn: 'Refreshing author\'s drink based on natural lemon, orange, grapefruit juices and fresh mint leaves.',
    descriptionHu: 'Frissítő, házi készítésű ital friss citrom-, narancs- és grapefruitléből, valamint friss mentából.',
    ingredientsUa: 'Лимонний фреш, апельсиновий сік, свіжа м\'ята, тростинний цукор, газована вода',
    ingredientsEn: 'Lemon juice, orange juice, fresh mint, cane sugar, sparkling water',
    ingredientsHu: 'Citromlé, narancslé, friss menta, nádcukor, szénsavas víz',
    price: 85,
    category: 'cat-drinks',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80',
    isAvailable: true,
  }
];

// Initial Tables
const DEFAULT_TABLES = ['1', '2', '3', '4', '5'];

// Dictionary for internationalization
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
  'cart.no_payment_notice': { ua: 'Оплата здійснюється офіціанту при отриманні рахунку.', en: 'Payment is made directly to the waiter upon receiving the bill.', hu: 'A fizetés a pincérnél történik a számla kézhezvételekor.' },
  
  // Owner Cabinet Login
  'login.title': { ua: 'Вхід до кабінету власника', en: 'Owner Cabinet Login', hu: 'Belépés a tulajdonosi kabinetbe' },
  'login.password': { ua: 'Введіть пароль доступу:', en: 'Enter Access Password:', hu: 'Adja meg a hozzáférési jelszót:' },
  'login.submit': { ua: 'Увійти', en: 'Log In', hu: 'Belépés' },
  'login.invalid': { ua: 'Невірний пароль! Спробуйте ще раз.', en: 'Invalid password! Please try again.', hu: 'Helytelen jelszó! Próbálja újra.' },
  'login.default_notice': { ua: 'Пароль за замовчуванням: admin123', en: 'Default password is: admin123', hu: 'Alapértelmezett jelszó: admin123' },
  
  // Owner Cabinet Dashboard
  'dashboard.title': { ua: 'Панель керування', en: 'Management Panel', hu: 'Vezérlőpult' },
  'dashboard.logout': { ua: 'Вийти', en: 'Log Out', hu: 'Kijelentkezés' },
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

  // Categories Management
  'cat.add_category': { ua: 'Додати категорію', en: 'Add Category', hu: 'Kategória hozzáadása' },
  'cat.edit_category': { ua: 'Редагувати категорію', en: 'Edit Category', hu: 'Kategória szerkesztése' },
  'cat.name_ua': { ua: 'Назва категорії (УКР)', en: 'Category Name (UA)', hu: 'Kategória neve (UA)' },
  'cat.name_en': { ua: 'Назва категорії (ENG)', en: 'Category Name (EN)', hu: 'Kategória neve (EN)' },
  'cat.name_hu': { ua: 'Назва категорії (HUN)', en: 'Category Name (HU)', hu: 'Kategória neve (HU)' },
  'cat.icon': { ua: 'Іконка (Емодзі)', en: 'Icon (Emoji)', hu: 'Ikon (Emoji)' },
  'cat.delete_confirm': { ua: 'Видалити категорію? Страви цієї категорії не зникнуть, але потребуватимуть оновлення категорії.', en: 'Delete category? Dishes in this category will remain but need category updating.', hu: 'Törli a kategóriát? Az ebbe a kategóriába tartozó ételek megmaradnak, de frissíteni kell a kategóriájukat.' },

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
};

export function QRMenuProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('qr_menu_items');
        return stored ? JSON.parse(stored) : DEFAULT_MENU_ITEMS;
      } catch (e) {
        console.error("Error reading qr_menu_items from localStorage", e);
      }
    }
    return DEFAULT_MENU_ITEMS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('qr_menu_categories');
        return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
      } catch (e) {
        console.error("Error reading qr_menu_categories from localStorage", e);
      }
    }
    return DEFAULT_CATEGORIES;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('qr_menu_orders');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error("Error reading qr_menu_orders from localStorage", e);
      }
    }
    return [];
  });

  const [tables, setTables] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('qr_menu_tables');
        return stored ? JSON.parse(stored) : DEFAULT_TABLES;
      } catch (e) {
        console.error("Error reading qr_menu_tables from localStorage", e);
      }
    }
    return DEFAULT_TABLES;
  });

  const [language, setLanguage] = useState<'ua' | 'en' | 'hu'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('qr_menu_lang') as 'ua' | 'en' | 'hu';
        return stored || 'ua';
      } catch (e) {
        console.error("Error reading qr_menu_lang from localStorage", e);
      }
    }
    return 'ua';
  });

  // Save changes to local storage
  useEffect(() => {
    localStorage.setItem('qr_menu_items', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('qr_menu_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('qr_menu_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('qr_menu_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('qr_menu_lang', language);
  }, [language]);

  // Sync data across tabs instantly in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'qr_menu_items' && e.newValue) {
        setMenuItems(JSON.parse(e.newValue));
      } else if (e.key === 'qr_menu_categories' && e.newValue) {
        setCategories(JSON.parse(e.newValue));
      } else if (e.key === 'qr_menu_orders' && e.newValue) {
        setOrders(JSON.parse(e.newValue));
      } else if (e.key === 'qr_menu_tables' && e.newValue) {
        setTables(JSON.parse(e.newValue));
      } else if (e.key === 'qr_menu_lang' && e.newValue) {
        setLanguage(e.newValue as 'ua' | 'en' | 'hu');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Translation helper function
  const t = (key: string): string => {
    const translation = TRANSLATIONS[key];
    if (!translation) return key;
    return translation[language] || translation['en'] || translation['ua'] || key;
  };

  // Menu items CRUD
  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: `dish-${Date.now()}`,
    };
    setMenuItems((prev) => [...prev, newItem]);
  };

  const updateMenuItem = (id: string, item: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...item } : m))
    );
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
  };

  // Categories CRUD
  const addCategory = (category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const updateCategory = (id: string, category: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...category } : c))
    );
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Orders CRUD
  const createOrder = (tableId: string, items: OrderItem[], notes?: string) => {
    const newOrderId = `order-${Date.now()}`;
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newOrder: Order = {
      id: newOrderId,
      tableId,
      items,
      totalPrice,
      status: 'new',
      createdAt: new Date().toISOString(),
      notes,
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrderId;
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  };

  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // Tables
  const addTable = (tableId: string) => {
    if (!tableId || tables.includes(tableId)) return;
    setTables((prev) => [...prev, tableId].sort((a, b) => {
      // Sort numerically if possible, otherwise alphabetically
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    }));
  };

  const deleteTable = (tableId: string) => {
    setTables((prev) => prev.filter((t) => t !== tableId));
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
