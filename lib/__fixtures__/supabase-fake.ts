// Shared in-memory fake of lib/supabase/client for tests.
// Mirrors the supabase-js surface the app uses: query builder chain,
// auth (getSession/onAuthStateChange/signInWithPassword/signOut),
// channel subscribe, storage upload.

export type FakeRow = Record<string, unknown>;

export interface FakeSession {
  user: { email: string } | null;
}

export interface SupabaseFake {
  state: {
    db: Record<string, FakeRow[]>;
    session: FakeSession | null;
    listeners: Array<(event: string, session: unknown) => void>;
    channels: unknown[];
  };
  reset: () => void;
  supabase: {
    from: (table: string) => unknown;
    channel: (name: string) => unknown;
    removeChannel: () => void;
    auth: {
      getSession: () => Promise<{ data: { session: FakeSession | null }; error: null }>;
      onAuthStateChange: (
        cb: (event: string, session: unknown) => void
      ) => { data: { subscription: { unsubscribe: () => void } } };
      signInWithPassword: (args: {
        email: string;
        password: string;
      }) => Promise<{ data: { session: FakeSession | null }; error: { message: string } | null }>;
      signOut: () => Promise<{ error: null }>;
    };
    storage: {
      from: () => {
        upload: () => Promise<{ error: null }>;
        getPublicUrl: () => { data: { publicUrl: string } };
      };
    };
  };
}

export function createSupabaseFake(): SupabaseFake {
  const state: {
    db: Record<string, FakeRow[]>;
    session: FakeSession | null;
    listeners: Array<(event: string, session: unknown) => void>;
    channels: unknown[];
  } = {
    db: { categories: [], menu_items: [], tables: [], orders: [], order_items: [] },
    session: null,
    listeners: [],
    channels: [],
  };

  const reset = () => {
    state.db = { categories: [], menu_items: [], tables: [], orders: [], order_items: [] };
    state.session = null;
    state.listeners = [];
    state.channels = [];
  };

  const makeBuilder = (table: string) => {
    let filters: Array<(r: FakeRow) => boolean> = [];
    let orderCol: string | null = null;
    let ascending = true;
    let embedItems = false;
    let singleMode = false;
    const inserted: FakeRow[] = [];

    const result = () => {
      // insert().select() returns the inserted rows (like PostgREST)
      if (inserted.length > 0) {
        return singleMode ? (inserted[0] ?? null) : inserted;
      }
      let rows = state.db[table].filter((r) => filters.every((f) => f(r)));
      if (orderCol) {
        rows = [...rows].sort((a, b) => {
          const av = a[orderCol!] as string | number;
          const bv = b[orderCol!] as string | number;
          if (typeof av === 'number' && typeof bv === 'number') {
            return ascending ? av - bv : bv - av;
          }
          return ascending
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
        });
      }
      if (embedItems) {
        rows = rows.map((r) => ({
          ...r,
          order_items: state.db.order_items.filter((oi) => oi.order_id === r.id),
        }));
      }
      return singleMode ? (rows[0] ?? null) : rows;
    };

    const chain = {
      select(cols?: string) {
        embedItems = cols === '*, order_items(*)';
        return chain;
      },
      eq(col: string, val: unknown) {
        filters.push((r) => r[col] === val);
        return chain;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        ascending = opts?.ascending ?? true;
        return chain;
      },
      insert(rows: FakeRow | FakeRow[]) {
        const arr = Array.isArray(rows) ? rows : [rows];
        for (const r of arr) {
          if (!r.id) {
            r.id =
              typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          }
          state.db[table].push(r);
          inserted.push(r);
        }
        return chain;
      },
      update(obj: FakeRow) {
        return {
          eq: (col: string, val: unknown) => {
            state.db[table] = state.db[table].map((r) =>
              r[col] === val ? { ...r, ...obj } : r
            );
            return chain;
          },
        };
      },
      delete() {
        return {
          eq: (col: string, val: unknown) => {
            state.db[table] = state.db[table].filter((r) => r[col] !== val);
            return chain;
          },
        };
      },
      single() {
        singleMode = true;
        return chain;
      },
      then(onFulfilled: (v: { data: unknown; error: null }) => unknown) {
        return Promise.resolve({ data: result(), error: null }).then(onFulfilled);
      },
    };
    return chain;
  };

  const supabase = {
    from: (table: string) => makeBuilder(table),
    channel: (name: string) => {
      const ch = {
        name,
        on: () => ch,
        subscribe: () => ch,
      };
      state.channels.push(ch);
      return ch;
    },
    removeChannel: () => {},
    auth: {
      getSession: () => Promise.resolve({ data: { session: state.session }, error: null }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        state.listeners.push(cb);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                state.listeners = state.listeners.filter((l) => l !== cb);
              },
            },
          },
        };
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        if (password === 'wrong-password') {
          return { data: { session: null }, error: { message: 'Invalid login credentials' } };
        }
        state.session = { user: { email } };
        state.listeners.forEach((l) => l('SIGNED_IN', state.session));
        return { data: { session: state.session }, error: null };
      },
      signOut: async () => {
        state.session = null;
        state.listeners.forEach((l) => l('SIGNED_OUT', null));
        return { error: null };
      },
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/x.jpg' } }),
      }),
    },
  };

  return { state, reset, supabase };
}
