-- Seed data for QR Menu for Cafe (idempotent).
-- Run once against the remote project (or via `execute_sql`); uses fixed
-- UUIDs so categories/menu items/tables can be referenced deterministically.

-- Categories
insert into public.categories (id, name_ua, name_en, name_hu, icon, position) values
  ('10000000-0000-4000-8000-000000000001', 'Піца',           'Pizza',           'Pizza',           '🍕', 1),
  ('10000000-0000-4000-8000-000000000002', 'Бургери',        'Burgers',         'Burgerek',        '🍔', 2),
  ('10000000-0000-4000-8000-000000000003', 'Супи та Салати', 'Soups & Salads',  'Levesek és Saláták', '🥗', 3),
  ('10000000-0000-4000-8000-000000000004', 'Десерти',        'Desserts',        'Desszertek',      '🍰', 4),
  ('10000000-0000-4000-8000-000000000005', 'Напої',          'Drinks',          'Italok',          '🥤', 5)
on conflict (id) do nothing;

-- Menu items
insert into public.menu_items (id, category_id, name_ua, name_en, name_hu, description_ua, description_en, description_hu, ingredients_ua, ingredients_en, ingredients_hu, price, image, is_available, position) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Піца Маргарита', 'Pizza Margherita', 'Pizza Margherita',
   'Класична італійська піца зі стиглими томатами, ніжною моцарелою та свіжим зеленим базиліком.',
   'Classic Italian pizza with ripe tomatoes, tender mozzarella, and fresh green basil.',
   'Klasszikus olasz pizza érett paradicsommal, lágy mozzarellával és friss zöld bazsalikommal.',
   'Томатний соус, сир моцарела, свіжий базилік, оливкова олія',
   'Tomato sauce, mozzarella cheese, fresh basil, olive oil',
   'Paradicsomszósz, mozzarella sajt, friss bazsalikom, olívaolaj',
   195, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80', true, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Бургер Фірмовий з беконом', 'Signature Bacon Burger', 'Különleges baconös burger',
   'Соковита котлета зі 100% яловичини на грилі, сир чеддер, хрусткий підсмажений бекон, томати, солодкий маринований огірок та наш унікальний соус.',
   'Juicy 100% grilled beef patty, cheddar cheese, crispy toasted bacon, tomatoes, sweet pickles, and our unique sauce.',
   'Lédús, 100% grillezett marhahúspogácsa, cheddar sajt, ropogós sült bacon, paradicsom, édes csemegeuborka és egyedi szószunk.',
   'Булочка бріош, яловича котлета, сир чеддер, бекон, листя салату, томати, маринований огірок, фірмовий соус BBQ',
   'Brioche bun, beef patty, cheddar cheese, bacon, lettuce, tomatoes, pickles, signature BBQ sauce',
   'Brioche zsemle, marhahúspogácsa, cheddar sajt, bacon, saláta, paradicsom, savanyú uborka, különleges BBQ szósz',
   245, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', true, 1),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Салат Цезар з куркою', 'Caesar Salad with Chicken', 'Cézár saláta csirkehússal',
   'Хрустке свіже листя ромену, соковите філе курячої грудки су-від гриль, витриманий пармезан, часникові пшеничні грінки та легендарний соус Цезар з анчоусами.',
   'Crisp fresh romaine lettuce, juicy sous-vide grilled chicken breast, aged parmesan cheese, garlic wheat croutons, and legendary Caesar dressing with anchovies.',
   'Ropogós, friss római saláta, lédús grillezett csirkemell filé, érlelt parmezán sajt, fokhagymás kruton és a legendás Cézár öntet szardellával.',
   'Салат ромен, куряче філе гриль, пармезан, пшеничні грінки, соус цезар, томати черрі',
   'Romaine lettuce, grilled chicken breast, parmesan, wheat croutons, caesar dressing, cherry tomatoes',
   'Római saláta, grillezett csirkemell, parmezán, kruton, cézár öntet, koktélparadicsom',
   180, 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=500&q=80', true, 1),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'Томатний крем-суп з базиліком', 'Tomato Cream Soup with Basil', 'Paradicsom krémleves bazsalikommal',
   'Оксамитовий гарячий суп із запечених італійських томатів вершків, приправлений орегано та свіжим базиліковим песто, подається з хрусткими крутонами.',
   'Velvety hot soup made of roasted Italian plum tomatoes, seasoned with oregano and fresh basil pesto, served with crispy croutons.',
   'Bársonyos, meleg leves sült olasz paradicsomból és tejszínből, oregánóval és friss bazsalikom pesztóval ízesítve, ropogós krutonnal tálalva.',
   'Стиглі томати, вершки, часник, цибуля, базилік, оливкова олія, пшеничні грінки',
   'Ripe tomatoes, cream, garlic, onions, basil, olive oil, wheat croutons',
   'Érett paradicsom, tejszín, fokhagyma, hagyma, bazsalikom, olívaolaj, kruton',
   150, 'https://images.unsplash.com/photo-1547592165-e1d17fed6006?auto=format&fit=crop&w=500&q=80', true, 1),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000004', 'Чізкейк Нью-Йорк з малиною', 'New York Cheesecake with Raspberry', 'New York sajttorta málnával',
   'Легендарний ніжний вершково-сирний торт на тонкому пісочному коржі, прикрашений ароматним натуральним малиновим соусом кулі.',
   'Legendary delicate cream cheese cake on a thin shortbread crust, topped with fragrant natural raspberry coulis sauce.',
   'Legendás, finom krémsajttorta vékony omlós tésztán, illatos természetes málnaöntettel a tetején.',
   'Вершковий сир, пісочне тісто, цукор, натуральні вершки, малина, лимонна цедра',
   'Cream cheese, shortbread crust, sugar, natural cream, raspberry, lemon zest',
   'Krémsajt, omlós tészta, cukor, tejszín, málna, citromhéj',
   110, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80', true, 1),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', 'Капучино Класичний', 'Classic Cappuccino', 'Klasszikus cappuccino',
   'Збалансований кавовий напій на основі подвійного еспресо зі свіжообсмаженої арабіки та ніжної пишної молочної піни.',
   'Balanced coffee drink based on a double shot of freshly roasted Arabica espresso and delicate rich frothed milk.',
   'Kiegyensúlyozott kávéital frissen pörkölt Arabica eszpresszó és finom, dús tejhab alapján.',
   'Кава арабіка, незбиране молоко',
   'Arabica coffee, whole milk',
   'Arabica kávé, teljes tej',
   65, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=80', true, 1),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000005', 'Цитрусовий Лимонад', 'Citrus Lemonade', 'Citrusos limonádé',
   'Освіжаючий авторський напій на основі натурального фрешу лимона, апельсина, грейпфрута та свіжого листя м''яти.',
   'Refreshing author''s drink based on natural lemon, orange, grapefruit juices and fresh mint leaves.',
   'Frissítő, házi készítésű ital friss citrom-, narancs- és grapefruitléből, valamint friss mentából.',
   'Лимонний фреш, апельсиновий сік, свіжа м''ята, тростинний цукор, газована вода',
   'Lemon juice, orange juice, fresh mint, cane sugar, sparkling water',
   'Citromlé, narancslé, friss menta, nádcukor, szénsavas víz',
   85, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80', true, 1)
on conflict (id) do nothing;

-- Tables (labels are what guests see in ?table=<label>)
insert into public.tables (label) values
  ('1'), ('2'), ('3'), ('4'), ('5')
on conflict (label) do nothing;
